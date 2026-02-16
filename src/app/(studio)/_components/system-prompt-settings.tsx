"use client";

import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { useEffect, useState } from "react";

type SystemPromptsConfig = {
  planningSystemPrompt: string;
  generationSystemPrompt: string;
};

function isSystemPromptsConfig(value: unknown): value is SystemPromptsConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SystemPromptsConfig>;
  return (
    typeof candidate.planningSystemPrompt === "string" &&
    typeof candidate.generationSystemPrompt === "string"
  );
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }

  return payload as T;
}

export default function SystemPromptSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [planningSystemPrompt, setPlanningSystemPrompt] = useState("");
  const [generationSystemPrompt, setGenerationSystemPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadPrompts() {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const payload = await requestJson<SystemPromptsConfig>(
          "/api/config/system-prompts",
          {
            cache: "no-store",
          },
        );

        if (!isSystemPromptsConfig(payload)) {
          throw new Error("Invalid prompts response shape");
        }

        if (isCancelled) {
          return;
        }

        setPlanningSystemPrompt(payload.planningSystemPrompt);
        setGenerationSystemPrompt(payload.generationSystemPrompt);
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load system prompts",
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPrompts();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = await requestJson<SystemPromptsConfig>(
        "/api/config/system-prompts",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planningSystemPrompt,
            generationSystemPrompt,
          }),
        },
      );

      if (!isSystemPromptsConfig(payload)) {
        throw new Error("Invalid prompts response shape");
      }

      setPlanningSystemPrompt(payload.planningSystemPrompt);
      setGenerationSystemPrompt(payload.generationSystemPrompt);
      setSuccessMessage("System prompts saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save system prompts",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="bordered"
        className="w-full justify-start"
        onPress={() => setIsOpen(true)}
      >
        System Prompt Settings
      </Button>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen} size="3xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>System Prompt Settings</ModalHeader>
              <ModalBody className="space-y-4">
                {errorMessage ? (
                  <Alert color="danger" description={errorMessage} />
                ) : null}
                {successMessage ? (
                  <Alert color="success" description={successMessage} />
                ) : null}

                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Planning System Prompt
                  </span>
                  <Textarea
                    value={planningSystemPrompt}
                    onChange={(event) =>
                      setPlanningSystemPrompt(event.target.value)
                    }
                    minRows={6}
                    isDisabled={isLoading || isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Generation System Prompt
                  </span>
                  <Textarea
                    value={generationSystemPrompt}
                    onChange={(event) =>
                      setGenerationSystemPrompt(event.target.value)
                    }
                    minRows={6}
                    isDisabled={isLoading || isSaving}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  onPress={handleSave}
                  isLoading={isSaving}
                  isDisabled={isLoading}
                >
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
