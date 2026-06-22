import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { CheckInService } from '../src/modules/checkin/services/checkin.service';

function createService() {
    const mockPrisma = {
        concert: {
            findUnique: fn(),
        },
        ticket: {
            findMany: fn(),
            findUnique: fn(),
            update: fn(),
            updateMany: fn(),
        },
        $executeRaw: fn().mockResolvedValue(1),
        $transaction: fn(async (callback) => {
            return callback(mockPrisma);
        }),
    };

    const service = new CheckInService(mockPrisma as any);
    (service as any).logger = {
        log: fn(),
        warn: fn(),
        error: fn(),
    };

    return { service, mockPrisma };
}

test('prefetchTickets returns qr_code_hash list for a valid concert and gate', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findUnique.mockResolvedValue({
        status: 'PUBLISHED',
        ticket_categories: [
            {
                tickets: [
                    { qr_code_hash: 'hash-vip-1' },
                    { qr_code_hash: 'hash-vip-2' },
                ]
            }
        ]
    });

    const result = await service.prefetchTickets('concert-123', 1);

    assert.equal(mockPrisma.concert.findUnique.mock.calls.length, 1);
    const findUniqueArgs = mockPrisma.concert.findUnique.mock.calls[0][0];
    assert.deepEqual(findUniqueArgs.where, { id: 'concert-123' });
    assert.ok(findUniqueArgs.select);
    assert.ok(findUniqueArgs.select.ticket_categories);
    assert.deepEqual(findUniqueArgs.select.ticket_categories.where, { gate_number: 1 });

    assert.deepEqual(result, ['hash-vip-1', 'hash-vip-2']);
});

test('prefetchTickets throws BadRequestException on empty gateId', async () => {
    const { service } = createService();

    await assert.rejects(
        async () => {
            await service.prefetchTickets('concert-123', undefined as any);
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.match(err.message, /gate_id or gate_number query parameter is required/);
            return true;
        }
    );
});

test('prefetchTickets throws NotFoundException if concert not found', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findUnique.mockResolvedValue(null);

    await assert.rejects(
        async () => {
            await service.prefetchTickets('concert-123', 1);
        },
        (err: any) => {
            assert.equal(err.name, 'NotFoundException');
            assert.match(err.message, /Concert not found/);
            return true;
        }
    );
});

test('prefetchTickets throws BadRequestException if concert status is not PUBLISHED', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findUnique.mockResolvedValue({
        status: 'DRAFT',
        ticket_categories: []
    });

    await assert.rejects(
        async () => {
            await service.prefetchTickets('concert-123', 1);
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.match(err.message, /Concert is not published/);
            return true;
        }
    );
});

test('syncTickets handles empty updates gracefully', async () => {
    const { service } = createService();

    const result = await service.syncTickets([]);
    assert.deepEqual(result, {
        success: true,
        processed: 0,
        updated: 0,
        conflicts: 0,
        errors: 0,
    });
});

test('syncTickets updates unscanned ticket', async () => {
    const { service, mockPrisma } = createService();

    const testTime = '2026-06-16T12:00:00.000Z';
    const checkerId = 'checker-uuid';

    mockPrisma.ticket.findMany.mockResolvedValue([
        {
            id: 'ticket-1',
            qr_code_hash: 'hash-vip-1',
            is_scanned: false,
            scanned_at: null,
            scanned_by: null,
        }
    ]);

    const result = await service.syncTickets([
        { qr_code_hash: 'hash-vip-1', scanned_at: testTime, scanned_by: checkerId },
    ]);

    assert.equal(mockPrisma.ticket.findMany.mock.calls.length, 1);
    assert.equal(mockPrisma.$executeRaw.mock.calls.length, 1);
    
    // Ensure raw update contains the query fields
    const executeRawArgs = mockPrisma.$executeRaw.mock.calls[0][0];
    assert.ok(executeRawArgs);

    assert.deepEqual(result, {
        success: true,
        processed: 1,
        updated: 1,
        conflicts: 0,
        errors: 0,
    });
});

test('syncTickets overwrites earlier offline scan if ticket is already scanned', async () => {
    const { service, mockPrisma } = createService();

    const testTimeEarlier = '2026-06-16T11:00:00.000Z';
    const existingDbTime = '2026-06-16T12:00:00.000Z';
    const checkerId = 'checker-uuid';

    mockPrisma.ticket.findMany.mockResolvedValue([
        {
            id: 'ticket-1',
            qr_code_hash: 'hash-vip-1',
            is_scanned: true,
            scanned_at: new Date(existingDbTime),
            scanned_by: 'old-checker',
        }
    ]);

    const result = await service.syncTickets([
        { qr_code_hash: 'hash-vip-1', scanned_at: testTimeEarlier, scanned_by: checkerId },
    ]);

    assert.equal(mockPrisma.ticket.findMany.mock.calls.length, 1);
    assert.equal(mockPrisma.$executeRaw.mock.calls.length, 1);

    assert.deepEqual(result, {
        success: true,
        processed: 1,
        updated: 1,
        conflicts: 0,
        errors: 0,
    });
});

test('syncTickets rejects later offline scan if ticket is already scanned', async () => {
    const { service, mockPrisma } = createService();

    const testTimeLater = '2026-06-16T13:00:00.000Z';
    const existingDbTime = '2026-06-16T12:00:00.000Z';
    const checkerId = 'checker-uuid';

    mockPrisma.ticket.findMany.mockResolvedValue([
        {
            id: 'ticket-1',
            qr_code_hash: 'hash-vip-1',
            is_scanned: true,
            scanned_at: new Date(existingDbTime),
            scanned_by: 'old-checker',
        }
    ]);

    const result = await service.syncTickets([
        { qr_code_hash: 'hash-vip-1', scanned_at: testTimeLater, scanned_by: checkerId },
    ]);

    assert.equal(mockPrisma.ticket.findMany.mock.calls.length, 1);
    // No update should be performed because it's a conflict
    assert.equal(mockPrisma.$executeRaw.mock.calls.length, 0);

    assert.deepEqual(result, {
        success: true,
        processed: 1,
        updated: 0,
        conflicts: 1,
        errors: 0,
    });
});

test('syncTickets sorts and deduplicates hashes to prevent deadlocks and multiple scan calls', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.ticket.findMany.mockResolvedValue([
        {
            id: 'ticket-zebra',
            qr_code_hash: 'zebra',
            is_scanned: false,
            scanned_at: null,
            scanned_by: null,
        },
        {
            id: 'ticket-apple',
            qr_code_hash: 'apple',
            is_scanned: false,
            scanned_at: null,
            scanned_by: null,
        },
        {
            id: 'ticket-mango',
            qr_code_hash: 'mango',
            is_scanned: false,
            scanned_at: null,
            scanned_by: null,
        }
    ]);

    await service.syncTickets([
        { qr_code_hash: 'zebra', scanned_at: '2026-06-16T12:00:00.000Z', scanned_by: 'chk' },
        { qr_code_hash: 'apple', scanned_at: '2026-06-16T12:00:00.000Z', scanned_by: 'chk' },
        { qr_code_hash: 'mango', scanned_at: '2026-06-16T12:00:00.000Z', scanned_by: 'chk' },
        { qr_code_hash: 'apple', scanned_at: '2026-06-16T11:00:00.000Z', scanned_by: 'chk' }, // duplicate with earlier time
    ]);

    assert.equal(mockPrisma.ticket.findMany.mock.calls.length, 1);
    const findManyWhere = mockPrisma.ticket.findMany.mock.calls[0][0].where;
    
    // Assert the list of hashes queried was sorted and unique: ['apple', 'mango', 'zebra']
    assert.deepEqual(findManyWhere.qr_code_hash.in, ['apple', 'mango', 'zebra']);
});

test('syncTickets applies optional concertId and gateId scoping filters to queries', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.ticket.findMany.mockResolvedValue([]);

    await service.syncTickets(
        [{ qr_code_hash: 'hash-vip-1', scanned_at: '2026-06-16T12:00:00.000Z', scanned_by: 'checker' }],
        'concert-uuid',
        5
    );

    assert.equal(mockPrisma.ticket.findMany.mock.calls.length, 1);
    const findManyWhere = mockPrisma.ticket.findMany.mock.calls[0][0].where;
    assert.deepEqual(findManyWhere.qr_code_hash, { in: ['hash-vip-1'] });
    assert.deepEqual(findManyWhere.order, { concert_id: 'concert-uuid' });
    assert.deepEqual(findManyWhere.category, { gate_number: 5 });
});

test('scanTicket returns ACCEPTED on a valid unscanned ticket', async () => {
    const { service, mockPrisma } = createService();

    const mockTicket = {
        id: 't-123',
        qr_code_hash: 'hash-vip-1',
        is_scanned: false,
        scanned_at: null,
        scanned_by: null,
        order: {
            concert_id: 'concert-123',
            status: 'PAID'
        },
        category: {
            gate_number: 1
        }
    };

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(mockTicket);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.scanTicket('user-1', {
        concert_id: 'concert-123',
        gate_id: 1,
        qr_code_hash: 'hash-vip-1',
        scanned_at: '2026-06-17T10:00:00.000Z'
    });

    assert.equal(result.status, 'ACCEPTED');
    assert.deepEqual(result.scanned_at, new Date('2026-06-17T10:00:00.000Z'));
    assert.equal(mockPrisma.ticket.updateMany.mock.calls.length, 1);
});

test('scanTicket returns DUPLICATE on a concurrent double scan update (updateMany returning count 0)', async () => {
    const { service, mockPrisma } = createService();

    const mockTicket = {
        id: 't-123',
        qr_code_hash: 'hash-vip-1',
        is_scanned: false,
        scanned_at: null,
        scanned_by: null,
        order: {
            concert_id: 'concert-123',
            status: 'PAID'
        },
        category: {
            gate_number: 1
        }
    };

    const scannedTicket = {
        scanned_at: new Date('2026-06-17T10:00:01.000Z'),
        scanned_by: 'concurrent-user'
    };

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(mockTicket); // initial lookup
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 0 }); // concurrent transaction wins first
    mockPrisma.ticket.findUnique.mockResolvedValueOnce(scannedTicket); // lookup refreshed data

    const result = await service.scanTicket('user-1', {
        concert_id: 'concert-123',
        gate_id: 1,
        qr_code_hash: 'hash-vip-1',
        scanned_at: '2026-06-17T10:00:02.000Z'
    });

    assert.equal(result.status, 'DUPLICATE');
    assert.deepEqual(result.scanned_at, scannedTicket.scanned_at);
    assert.equal(result.scanned_by, 'concurrent-user');
    assert.equal(mockPrisma.ticket.updateMany.mock.calls.length, 1);
});

test('scanTicket returns DUPLICATE on an already scanned ticket', async () => {
    const { service, mockPrisma } = createService();

    const mockTicket = {
        id: 't-123',
        qr_code_hash: 'hash-vip-1',
        is_scanned: true,
        scanned_at: new Date('2026-06-17T09:00:00.000Z'),
        scanned_by: 'old-user',
        order: {
            concert_id: 'concert-123',
            status: 'PAID'
        },
        category: {
            gate_number: 1
        }
    };

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(mockTicket);

    const result = await service.scanTicket('user-1', {
        concert_id: 'concert-123',
        gate_id: 1,
        qr_code_hash: 'hash-vip-1'
    });

    assert.equal(result.status, 'DUPLICATE');
    assert.deepEqual(result.scanned_at, new Date('2026-06-17T09:00:00.000Z'));
    assert.equal(result.scanned_by, 'old-user');
});

test('scanTicket returns INVALID_GATE when concert or gate does not match', async () => {
    const { service, mockPrisma } = createService();

    const mockTicket = {
        id: 't-123',
        qr_code_hash: 'hash-vip-1',
        is_scanned: false,
        scanned_at: null,
        scanned_by: null,
        order: {
            concert_id: 'concert-123',
            status: 'PAID'
        },
        category: {
            gate_number: 1
        }
    };

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(mockTicket);
    let result = await service.scanTicket('user-1', {
        concert_id: 'concert-123',
        gate_id: 2,
        qr_code_hash: 'hash-vip-1'
    });
    assert.equal(result.status, 'INVALID_GATE');

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(mockTicket);
    result = await service.scanTicket('user-1', {
        concert_id: 'concert-456',
        gate_id: 1,
        qr_code_hash: 'hash-vip-1'
    });
    assert.equal(result.status, 'INVALID_GATE');
});

test('scanTicket returns NOT_FOUND when ticket hash does not exist', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(null);

    const result = await service.scanTicket('user-1', {
        concert_id: 'concert-123',
        gate_id: 1,
        qr_code_hash: 'non-existent'
    });

    assert.equal(result.status, 'NOT_FOUND');
});

test('scanTicket returns UNPAID when ticket order is not paid', async () => {
    const { service, mockPrisma } = createService();

    const mockTicket = {
        id: 't-123',
        qr_code_hash: 'hash-vip-1',
        is_scanned: false,
        scanned_at: null,
        scanned_by: null,
        order: {
            concert_id: 'concert-123',
            status: 'PENDING'
        },
        category: {
            gate_number: 1
        }
    };

    mockPrisma.ticket.findUnique.mockResolvedValueOnce(mockTicket);

    const result = await service.scanTicket('user-1', {
        concert_id: 'concert-123',
        gate_id: 1,
        qr_code_hash: 'hash-vip-1'
    });

    assert.equal(result.status, 'UNPAID');
});

