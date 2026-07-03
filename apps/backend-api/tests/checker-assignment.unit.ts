import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { CheckerAssignmentService } from '../src/modules/checkin/services/checker-assignment.service';

function createService() {
    const mockPrisma = {
        user: {
            findUnique: fn(),
            findMany: fn(),
        },
        concert: {
            findUnique: fn(),
            findMany: fn(),
        },
        checkerAssignment: {
            findUnique: fn(),
            findMany: fn(),
            count: fn(),
            create: fn(),
            update: fn(),
            delete: fn(),
        },
        $transaction: fn(async (arg) => {
            if (typeof arg === 'function') {
                return arg(mockPrisma);
            }
            return Promise.all(arg);
        }),
    };

    const service = new CheckerAssignmentService(mockPrisma as any);
    return { service, mockPrisma };
}

test('createAssignment succeeds with valid data', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'checker-123',
        user_roles: [
            { role: { name: 'Checker' } }
        ]
    });

    mockPrisma.concert.findUnique.mockResolvedValue({
        id: 'concert-123',
        ticket_categories: [
            { gate_number: 1 },
            { gate_number: 2 }
        ]
    });

    mockPrisma.checkerAssignment.findUnique.mockResolvedValue(null);

    mockPrisma.checkerAssignment.create.mockResolvedValue({
        id: 'assign-123',
        checker_id: 'checker-123',
        concert_id: 'concert-123',
        gate_number: 1,
    });

    const result = await service.createAssignment({
        checker_id: 'checker-123',
        concert_id: 'concert-123',
        gate_number: 1,
    });

    assert.equal(result.id, 'assign-123');
    assert.equal(result.checker_id, 'checker-123');
    assert.equal(result.concert_id, 'concert-123');
    assert.equal(result.gate_number, 1);
});

test('createAssignment throws NotFoundException if user not found', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await assert.rejects(
        () => service.createAssignment({
            checker_id: 'checker-123',
            concert_id: 'concert-123',
            gate_number: 1,
        }),
        /User with ID checker-123 not found/
    );
});

test('createAssignment throws BadRequestException if user is not a checker', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'checker-123',
        user_roles: [
            { role: { name: 'Audience' } }
        ]
    });

    await assert.rejects(
        () => service.createAssignment({
            checker_id: 'checker-123',
            concert_id: 'concert-123',
            gate_number: 1,
        }),
        /User checker-123 does not have the 'Checker' role/
    );
});

test('createAssignment throws NotFoundException if concert not found', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'checker-123',
        user_roles: [
            { role: { name: 'Checker' } }
        ]
    });

    mockPrisma.concert.findUnique.mockResolvedValue(null);

    await assert.rejects(
        () => service.createAssignment({
            checker_id: 'checker-123',
            concert_id: 'concert-123',
            gate_number: 1,
        }),
        /Concert with ID concert-123 not found/
    );
});

test('createAssignment throws BadRequestException if gate_number is invalid', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'checker-123',
        user_roles: [
            { role: { name: 'Checker' } }
        ]
    });

    mockPrisma.concert.findUnique.mockResolvedValue({
        id: 'concert-123',
        ticket_categories: [
            { gate_number: 1 }
        ]
    });

    await assert.rejects(
        () => service.createAssignment({
            checker_id: 'checker-123',
            concert_id: 'concert-123',
            gate_number: 99, // invalid gate
        }),
        /Gate number 99 is not valid for concert concert-123/
    );
});

test('createAssignment throws BadRequestException if assignment already exists', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'checker-123',
        user_roles: [
            { role: { name: 'Checker' } }
        ]
    });

    mockPrisma.concert.findUnique.mockResolvedValue({
        id: 'concert-123',
        ticket_categories: [
            { gate_number: 1 }
        ]
    });

    mockPrisma.checkerAssignment.findUnique.mockResolvedValue({
        id: 'assign-existing',
    });

    await assert.rejects(
        () => service.createAssignment({
            checker_id: 'checker-123',
            concert_id: 'concert-123',
            gate_number: 1,
        }),
        /Checker is already assigned to this concert/
    );
});

test('createAssignment throws BadRequestException if gate is already assigned', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'checker-123',
        user_roles: [
            { role: { name: 'Checker' } }
        ]
    });

    mockPrisma.concert.findUnique.mockResolvedValue({
        id: 'concert-123',
        ticket_categories: [
            { gate_number: 1 }
        ]
    });

    mockPrisma.checkerAssignment.findUnique.mockImplementation(async (args) => {
        if (args.where.checker_id_concert_id) {
            return null;
        }
        if (args.where.concert_id_gate_number) {
            return { id: 'assign-existing-gate' };
        }
        return null;
    });

    await assert.rejects(
        () => service.createAssignment({
            checker_id: 'checker-123',
            concert_id: 'concert-123',
            gate_number: 1,
        }),
        /Gate number 1 is already assigned to another checker/
    );
});

test('getAssignments retrieves assignments with correct query filters', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findMany.mockResolvedValue([
        { id: 'assign-123', checker_id: 'checker-123', concert_id: 'concert-123', gate_number: 1 }
    ]);
    mockPrisma.checkerAssignment.count.mockResolvedValue(1);

    const result = await service.getAssignments({
        concert_id: 'concert-123',
        checker_id: 'checker-123',
        page: 1,
        limit: 10
    });

    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].id, 'assign-123');
    assert.equal(result.meta.totalItems, 1);
    assert.equal(result.meta.currentPage, 1);
    
    const findManyArgs = mockPrisma.checkerAssignment.findMany.mock.calls[0][0];
    assert.deepEqual(findManyArgs.where, {
        concert_id: 'concert-123',
        checker_id: 'checker-123'
    });
});

test('updateAssignment succeeds if gate is valid', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findUnique.mockImplementation(async (args) => {
        if (args.where.id === 'assign-123') {
            return {
                id: 'assign-123',
                concert_id: 'concert-123',
                concert: {
                    ticket_categories: [
                        { gate_number: 1 },
                        { gate_number: 2 }
                    ]
                }
            };
        }
        return null;
    });

    mockPrisma.checkerAssignment.update.mockResolvedValue({
        id: 'assign-123',
        gate_number: 2,
    });

    const result = await service.updateAssignment('assign-123', {
        gate_number: 2
    });

    assert.equal(result.gate_number, 2);
});

test('updateAssignment throws NotFoundException if assignment does not exist', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findUnique.mockResolvedValue(null);

    await assert.rejects(
        () => service.updateAssignment('assign-123', { gate_number: 2 }),
        /Assignment with ID assign-123 not found/
    );
});

test('updateAssignment throws BadRequestException if new gate is invalid', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findUnique.mockResolvedValue({
        id: 'assign-123',
        concert_id: 'concert-123',
        concert: {
            ticket_categories: [
                { gate_number: 1 }
            ]
        }
    });

    await assert.rejects(
        () => service.updateAssignment('assign-123', { gate_number: 99 }),
        /Gate number 99 is not valid for concert concert-123/
    );
});

test('updateAssignment throws BadRequestException if new gate is already assigned to another checker', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findUnique.mockImplementation(async (args) => {
        if (args.where.id === 'assign-123') {
            return {
                id: 'assign-123',
                concert_id: 'concert-123',
                concert: {
                    ticket_categories: [
                        { gate_number: 1 },
                        { gate_number: 2 }
                    ]
                }
            };
        }
        if (args.where.concert_id_gate_number) {
            return { id: 'assign-other-checker' };
        }
        return null;
    });

    await assert.rejects(
        () => service.updateAssignment('assign-123', { gate_number: 2 }),
        /Gate number 2 is already assigned to another checker/
    );
});

test('deleteAssignment succeeds if assignment exists', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findUnique.mockResolvedValue({ id: 'assign-123' });
    mockPrisma.checkerAssignment.delete.mockResolvedValue({});

    const result = await service.deleteAssignment('assign-123');

    assert.equal(result.success, true);
    assert.equal(result.message, 'Phân công đã được xóa thành công');
});

test('deleteAssignment throws NotFoundException if assignment does not exist', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.checkerAssignment.findUnique.mockResolvedValue(null);

    await assert.rejects(
        () => service.deleteAssignment('assign-123'),
        /Assignment with ID assign-123 not found/
    );
});

test('getActiveConcerts returns PUBLISHED concerts', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findMany.mockResolvedValue([
        { id: 'concert-1', name: 'Concert Active', status: 'PUBLISHED' }
    ]);

    const result = await service.getActiveConcerts();

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'concert-1');
    const findManyArgs = mockPrisma.concert.findMany.mock.calls[0][0];
    assert.deepEqual(findManyArgs.where, { status: 'PUBLISHED' });
});

test('getCheckers returns active checkers', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'checker@local', full_name: 'Checker 1' }
    ]);

    const result = await service.getCheckers();

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'user-1');
    const findManyArgs = mockPrisma.user.findMany.mock.calls[0][0];
    assert.deepEqual(findManyArgs.where, {
        user_roles: {
            some: {
                role: { name: 'Checker' }
            }
        },
        status: 'ACTIVE'
    });
});

test('getAvailableGates returns only unassigned gates', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findUnique.mockResolvedValue({
        id: 'concert-123',
        ticket_categories: [
            { gate_number: 1 },
            { gate_number: 2 },
            { gate_number: 3 }
        ],
        checker_assignments: [
            { gate_number: 2 }
        ]
    });

    const result = await service.getAvailableGates('concert-123');

    assert.deepEqual(result, [1, 3]); // gate 2 is already assigned
});

test('getAvailableGates throws NotFoundException if concert not found', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findUnique.mockResolvedValue(null);

    await assert.rejects(
        () => service.getAvailableGates('concert-123'),
        /Concert with ID concert-123 not found/
    );
});
