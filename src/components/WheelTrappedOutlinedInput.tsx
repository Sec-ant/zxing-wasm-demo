import { OutlinedInput, type OutlinedInputProps } from "@mui/material";
import { useCallback } from "react";

const WheelTrappedOutlinedInput = ({ ...props }: OutlinedInputProps) => {
  const handleWheel = useCallback((e: WheelEvent) => {
    e.stopPropagation();
  }, []);

  const callbackRef = useCallback(
    (element: HTMLInputElement | null) => {
      element?.addEventListener("wheel", handleWheel);
    },
    [handleWheel],
  );

  return <OutlinedInput {...props} ref={callbackRef} />;
};

export default WheelTrappedOutlinedInput;
