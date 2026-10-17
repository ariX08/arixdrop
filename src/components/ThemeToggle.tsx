"use client";

import { useEffect, useState } from "react";
import SquishSwitch from "./SquishSwitch";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pigeon-theme");
    const preferLight = stored === "light";
    setLight(preferLight);
    document.documentElement.classList.toggle("light", preferLight);
  }, []);

  function handleChange(next: boolean) {
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("pigeon-theme", next ? "light" : "dark");
  }

  return (
    <SquishSwitch
      checked={light}
      onChange={handleChange}
      ariaLabel={light ? "Switch to dark mode" : "Switch to light mode"}
      width={52}
      height={28}
      radius={14}
      trackColor="#27272a"
      trackOnColor="#f5f5f5"
      speed={55}
      stretch={30}
    />
  );
}
