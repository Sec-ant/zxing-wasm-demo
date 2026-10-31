import { Popover } from "@base-ui/react/popover";
import { ArrowRight, Link2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { message } from "../lib/settings";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function ImageUrlInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => onCancel, [onCancel]);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError("");
      }}
    >
      <Popover.Trigger
        render={<Button variant="glass" />}
        aria-label="Open image URL"
      >
        <Link2 />
        <span className="input-label-full">Image URL</span>
        <span className="input-label-compact">URL</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="image-url-positioner"
        >
          <Popover.Popup className="image-url-popover bg-popover">
            <Popover.Title className="image-url-title">Image URL</Popover.Title>
            <form
              className="remote-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                try {
                  await onSubmit(value.trim());
                  setOpen(false);
                } catch (error) {
                  setError(message(error));
                }
              }}
            >
              <div className="url-row">
                <Input
                  aria-label="Image URL"
                  type="url"
                  required
                  value={value}
                  placeholder="https://…/image.png"
                  aria-invalid={Boolean(error)}
                  onChange={(event) => {
                    onChange(event.target.value);
                    setError("");
                  }}
                />
                <Button
                  type="submit"
                  aria-label="Open image"
                  disabled={busy || !value.trim()}
                >
                  {busy ? <LoaderCircle className="spin" /> : <ArrowRight />}
                  Open
                </Button>
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
