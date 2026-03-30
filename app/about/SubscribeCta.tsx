"use client";

import { Button } from "@/components/ui";

export function SubscribeCta() {
  const handleClick = () => {
    const footerInput = document.querySelector("#footer-subscribe input") as HTMLElement;
    if (footerInput) {
      footerInput.focus();
      footerInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return <Button onClick={handleClick}>Subscribe to Newsletter</Button>;
}