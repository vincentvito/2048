"use client";

import React from "react";
import { ThemeName, themeNames, themeLabels, themePreviewColors, themes } from "@/lib/themes";

interface ThemeSwitcherProps {
  current: ThemeName;
  onChange: (theme: ThemeName) => void;
}

export default function ThemeSwitcher({
  current,
  onChange,
}: ThemeSwitcherProps): React.ReactElement {
  return (
    <div className="theme-switcher">
      {themeNames.map((name) => {
        const colors = themePreviewColors[name];
        const theme = themes[name];
        const isActive = name === current;
        return (
          <button
            key={name}
            className={`theme-option${isActive ? " theme-option-active" : ""}`}
            onClick={() => onChange(name)}
            aria-label={`${themeLabels[name]} theme`}
            title={themeLabels[name]}
          >
            <div className="theme-preview" style={{ background: theme.bgGrid }}>
              {colors.map((c, i) => (
                <div key={i} className="theme-preview-tile" style={{ background: c }} />
              ))}
            </div>
            <span className="theme-label">{themeLabels[name]}</span>
          </button>
        );
      })}
    </div>
  );
}
