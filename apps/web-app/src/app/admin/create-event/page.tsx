"use client";

import Link from "next/link";
import { useEffect, useRef, useState, Suspense, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createConcert,
  updateConcert,
  getConcertById,
} from "@/services/concert.service";
import { getErrorMessage } from "@/utils/error.utils";
import {
  ChevronRight,
  Info,
  ImagePlus,
  Bot,
  Upload,
  Sparkles,
  Ticket,
  PlusCircle,
  Trash2,
} from "lucide-react";

type TicketCategory = {
  id?: string;
  name: string;
  price: number;
  total_quantity: number;
  max_per_user: number;
};

function EventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;
  const pressKitInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [pressKitFile, setPressKitFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    ai_bio: "",
    start_time: "",
    svg_map_url: "https://cdn.ticketbox.local/maps/default.svg",
    poster_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA96Q00R_bgOVwdSaXoQUFh4qVfI9j-ywdZH0M0n3UEcHkvg27Hc-IVfeqDv0zY5rITz7LfLg-PsHR9fs9vCYLfdTAr48gFSFvlNJyw4aYMTmFgn4tN5xZElV5qJh_mOyC71TmCRwrv-jb1WAzhPD1I6c0R12LHOwt6JrVxYEjLIbk9nj2yHFMRzZzrZ2Vw_pevGqUI5SmxPE1-MUNxiSPVF38B0OBBXFGSoYc6d9xUgDg0Ex-TwrOwqrqg3paEsKJJvwFVtnwg9sih",
    status: "PUBLISHED",
  });

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([
    {
      name: "General Admission",
      price: 500000,
      total_quantity: 1000,
      max_per_user: 4,
    },
  ]);

  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

  const handlePressKitButtonClick = () => {
    pressKitInputRef.current?.click();
  };

  const handlePressKitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPressKitFile(file);
  };

  useEffect(() => {
    if (editId) {
      getConcertById(editId)
        .then((data) => {
          // format start_time for datetime-local input (YYYY-MM-DDThh:mm)
          let formattedDate = "";
          try {
            if (data.startTime) {
              const dateObj = new Date(data.startTime);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().slice(0, 16);
              }
            }
          } catch {
            // Ignore date formatting issues and keep the empty input state.
          }

          setFormData({
            name: data.title || "",
            description: data.description || "",
            location:
              data.venue && data.city
                ? `${data.venue}, ${data.city}`
                : data.venue || "",
            ai_bio: data.aiBio || "",
            start_time: formattedDate,
            svg_map_url:
              data.mapUrl || "https://cdn.ticketbox.local/maps/default.svg",
            poster_url:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuA96Q00R_bgOVwdSaXoQUFh4qVfI9j-ywdZH0M0n3UEcHkvg27Hc-IVfeqDv0zY5rITz7LfLg-PsHR9fs9vCYLfdTAr48gFSFvlNJyw4aYMTmFgn4tN5xZElV5qJh_mOyC71TmCRwrv-jb1WAzhPD1I6c0R12LHOwt6JrVxYEjLIbk9nj2yHFMRzZzrZ2Vw_pevGqUI5SmxPE1-MUNxiSPVF38B0OBBXFGSoYc6d9xUgDg0Ex-TwrOwqrqg3paEsKJJvwFVtnwg9sih",
            status: data.status || "PUBLISHED",
          });

          if (data.ticketTiers && data.ticketTiers.length > 0) {
            setTicketCategories(
              data.ticketTiers.map((t) => ({
                id: t.id,
                name: t.name,
                price: t.price,
                total_quantity: t.total_quantity,
                max_per_user: t.max_per_user,
              })),
            );
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load concert", err);
          alert("Failed to load concert details.");
          setIsLoading(false);
        });
    }
  }, [editId]);

  const handleSave = async () => {
    if (!formData.name || !formData.location || !formData.start_time) {
      alert("Name, location, and start time are required.");
      return;
    }

    const startDate = new Date(formData.start_time);
    if (startDate <= new Date()) {
      alert("Start time must be a future date.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        start_time: startDate.toISOString(),
        status: "PUBLISHED",
        ticket_categories: ticketCategories,
      };

      if (isEditing) {
        await updateConcert(editId, payload);
        alert("Event updated successfully!");
      } else {
        await createConcert(payload);
        alert("Event created successfully!");
      }
      router.push("/admin/events");
    } catch (error: unknown) {
      console.error("Failed to save event", error);
      alert(`Failed to save event: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTier = () => {
    setTicketCategories([
      ...ticketCategories,
      { name: "New Tier", price: 0, total_quantity: 100, max_per_user: 2 },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    setTicketCategories(ticketCategories.filter((_, i) => i !== index));
  };

  const handleTierChange = (
    index: number,
    field: keyof TicketCategory,
    value: string | number,
  ) => {
    const newTiers = [...ticketCategories];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTicketCategories(newTiers);
  };

  const generateAIBio = () => {
    setIsGeneratingBio(true);
    setTimeout(() => {
      const pressKitHint = pressKitFile
        ? `Based on your press kit "${pressKitFile.name}", `
        : "Based on the event details you provided, ";

      setFormData((prev) => ({
        ...prev,
        ai_bio: `${pressKitHint}join us for an electrifying night at ${prev.location || "our premium venue"}! Experience the pulse-pounding beats and spectacular visuals of ${prev.name || "this exclusive event"}. This unforgettable night brings together top artists for a multi-sensory journey you won't forget. Secure your tickets now and be part of the music history.`,
      }));
      setIsGeneratingBio(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-4 border-b border-border">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex text-muted-foreground font-body text-xs font-semibold mb-2"
          >
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  className="hover:text-primary transition-colors"
                  href="/admin/events"
                >
                  Events
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRight className="w-4 h-4 mx-1" />
                  <span className="text-foreground">
                    {isEditing ? "Edit Event" : "Create New Event"}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {isEditing ? "Edit Your Event" : "Build Your Event"}
          </h2>
        </div>
        <div className="hidden md:flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Publish Event"}
          </button>
        </div>
      </header>

      {/* Form Wizard */}
      <div className="max-w-[800px] mx-auto">
        {/* Right Column: Form Sections */}
        <div className="space-y-8">
          {/* Section 1: Basic Info */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <h3 className="font-display text-xl font-bold border-b border-border pb-4 mb-6 flex items-center gap-2">
              <Info className="w-6 h-6 text-primary" />
              Basic Information
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Event Name
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-shadow text-sm"
                  placeholder="e.g. Neon Nights Festival 2024"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Description
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-shadow text-sm"
                  placeholder="Brief description of the event"
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-body text-xs font-semibold text-foreground mb-1">
                    Venue Location
                  </label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    type="text"
                    placeholder="e.g. District 1 Stadium, Ho Chi Minh City"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-foreground mb-1">
                    Date & Time
                  </label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Cover Image{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-border px-6 py-10 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group">
                  <div className="text-center">
                    <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <div className="mt-4 flex text-sm leading-6 text-muted-foreground justify-center">
                      <label className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none hover:text-primary/80">
                        <span>Upload a file</span>
                        <input className="sr-only" type="file" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Artist & AI Bio */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <h3 className="font-display text-xl font-bold border-b border-border pb-4 mb-6 flex items-center gap-2">
              <Bot className="w-6 h-6 text-secondary" />
              Artist & AI Bio Generation
            </h3>
            <div className="p-4 rounded-lg bg-surface-low border border-border mb-5">
              <h4 className="font-body text-xs font-semibold text-foreground mb-2">
                Upload Press Kit (PDF){" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  ref={pressKitInputRef}
                  accept=".pdf,application/pdf"
                  className="hidden"
                  type="file"
                  onChange={handlePressKitChange}
                />
                <button
                  type="button"
                  onClick={handlePressKitButtonClick}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface-high transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {pressKitFile ? "Replace File" : "Choose File"}
                </button>
                <span className="text-sm text-muted-foreground italic">
                  {pressKitFile
                    ? pressKitFile.name
                    : "No file selected. Upload a PDF to auto-generate an event bio."}
                </span>
              </div>
            </div>
            <div className="relative">
              <label className="block font-body text-xs font-semibold text-foreground mb-1 flex justify-between">
                <div>
                  Event Description (AI Generated){" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </div>
                <button
                  onClick={generateAIBio}
                  disabled={isGeneratingBio}
                  className="text-primary hover:text-primary/80 text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingBio ? "Generating..." : "Generate with AI"}
                </button>
              </label>

              <textarea
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                placeholder="Enter a compelling description for your event..."
                rows={6}
                value={formData.ai_bio}
                onChange={(e) =>
                  setFormData({ ...formData, ai_bio: e.target.value })
                }
                disabled={isGeneratingBio}
              ></textarea>
            </div>
          </section>

          {/* Section 3: Ticketing */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" />
                Ticket Configuration
              </h3>
              <button
                onClick={handleAddTier}
                className="text-primary font-body text-xs font-semibold flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-4 h-4" /> Add Tier
              </button>
            </div>

            {ticketCategories.map((tier, index) => (
              <div
                key={index}
                className="border border-border rounded-xl p-5 mb-4 bg-background relative overflow-hidden group"
              >
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${index % 2 === 0 ? "bg-secondary" : "bg-primary"}`}
                ></div>
                <div className="flex justify-between items-start mb-4 pl-2">
                  <input
                    className="font-display text-xl font-bold bg-transparent border-none p-0 focus:ring-0 w-2/3"
                    placeholder="Tier Name"
                    type="text"
                    value={tier.name}
                    onChange={(e) =>
                      handleTierChange(index, "name", e.target.value)
                    }
                  />
                  <button
                    onClick={() => handleRemoveTier(index)}
                    className="text-muted-foreground hover:text-error transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-2">
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Price (VND)
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="number"
                      value={tier.price}
                      onChange={(e) =>
                        handleTierChange(index, "price", Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Total Qty
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="number"
                      value={tier.total_quantity}
                      onChange={(e) =>
                        handleTierChange(
                          index,
                          "total_quantity",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Max/User
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="number"
                      value={tier.max_per_user}
                      onChange={(e) =>
                        handleTierChange(
                          index,
                          "max_per_user",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Mobile Action Buttons */}
          <div className="md:hidden flex gap-3 mt-8">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm text-center disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <EventForm />
    </Suspense>
  );
}
