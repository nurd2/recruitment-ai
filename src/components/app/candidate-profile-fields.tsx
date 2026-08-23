"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EducationEntry, WorkExperienceEntry } from "@/db/schema";

type Props = {
  education: EducationEntry[];
  workExperience: WorkExperienceEntry[];
  onEducationChange: (value: EducationEntry[]) => void;
  onWorkExperienceChange: (value: WorkExperienceEntry[]) => void;
};

export function CandidateProfileFields({
  education,
  workExperience,
  onEducationChange,
  onWorkExperienceChange,
}: Props) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Education</h2>
            <p className="text-sm text-muted-foreground">Add degrees or courses.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEducationChange([...education, { institution: "" }])}
          >
            <Plus /> Add education
          </Button>
        </div>
        {education.map((entry, index) => (
          <div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor={`education-${index}-institution`}>Institution</Label>
              <Input
                id={`education-${index}-institution`}
                value={entry.institution}
                onChange={(event) =>
                  onEducationChange(
                    education.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, institution: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`education-${index}-degree`}>Degree</Label>
              <Input
                id={`education-${index}-degree`}
                value={entry.degree ?? ""}
                onChange={(event) =>
                  onEducationChange(
                    education.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, degree: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`education-${index}-field`}>Field</Label>
              <Input
                id={`education-${index}-field`}
                value={entry.field ?? ""}
                onChange={(event) =>
                  onEducationChange(
                    education.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, field: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`education-${index}-start`}>Start year</Label>
              <Input
                id={`education-${index}-start`}
                type="number"
                value={entry.startYear ?? ""}
                onChange={(event) =>
                  onEducationChange(
                    education.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            startYear: event.target.value ? Number(event.target.value) : undefined,
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`education-${index}-end`}>End year</Label>
              <Input
                id={`education-${index}-end`}
                type="number"
                value={entry.endYear ?? ""}
                onChange={(event) =>
                  onEducationChange(
                    education.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            endYear: event.target.value ? Number(event.target.value) : undefined,
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start text-destructive"
              onClick={() =>
                onEducationChange(education.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 /> Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Work experience</h2>
            <p className="text-sm text-muted-foreground">
              Add relevant roles and responsibilities.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onWorkExperienceChange([...workExperience, { company: "", title: "" }])}
          >
            <Plus /> Add experience
          </Button>
        </div>
        {workExperience.map((entry, index) => (
          <div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`experience-${index}-title`}>Title</Label>
              <Input
                id={`experience-${index}-title`}
                value={entry.title}
                onChange={(event) =>
                  onWorkExperienceChange(
                    workExperience.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`experience-${index}-company`}>Company</Label>
              <Input
                id={`experience-${index}-company`}
                value={entry.company}
                onChange={(event) =>
                  onWorkExperienceChange(
                    workExperience.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, company: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`experience-${index}-start`}>Start</Label>
              <Input
                id={`experience-${index}-start`}
                value={entry.startDate ?? ""}
                onChange={(event) =>
                  onWorkExperienceChange(
                    workExperience.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, startDate: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`experience-${index}-end`}>End</Label>
              <Input
                id={`experience-${index}-end`}
                value={entry.endDate ?? ""}
                onChange={(event) =>
                  onWorkExperienceChange(
                    workExperience.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, endDate: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor={`experience-${index}-description`}>Description</Label>
              <Textarea
                id={`experience-${index}-description`}
                rows={3}
                value={entry.description ?? ""}
                onChange={(event) =>
                  onWorkExperienceChange(
                    workExperience.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start text-destructive"
              onClick={() =>
                onWorkExperienceChange(workExperience.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 /> Remove
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
