"use client";

import React, { useState, useEffect } from "react";

export default function HowToPlay(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile via touch capability and screen width
    const checkMobile = () => {
      const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 600;
      setIsMobile(hasTouchScreen && isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="how-to-play">
      <button
        onClick={() => setOpen(!open)}
        className="how-to-play-toggle"
        aria-expanded={open}
        aria-controls="how-to-play-content"
      >
        <span>How to Play</span>
        <svg
          className={`toggle-icon ${open ? "open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div id="how-to-play-content" className="how-to-play-content">
          <div className="play-instructions">
            <div className="instruction-item">
              <div className="instruction-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12H19M19 12L13 6M19 12L13 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <strong>Swipe or Arrow Keys</strong>
                <p>Slide tiles in any direction — up, down, left, or right.</p>
              </div>
            </div>

            <div className="instruction-item">
              <div className="instruction-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="8"
                    height="8"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="13"
                    y="3"
                    width="8"
                    height="8"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M7 7H7.01M17 7H17.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 15L8 19M12 15L16 19M12 15V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <strong>Merge Matching Tiles</strong>
                <p>When two tiles with the same number touch, they merge into one.</p>
              </div>
            </div>

            <div className="instruction-item">
              <div className="instruction-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <strong>Reach 2048</strong>
                <p>Keep merging to create the 2048 tile. Can you go even higher?</p>
              </div>
            </div>
          </div>

          <div className="controls-guide">
            <h4>Controls</h4>
            <div className="controls-grid">
              <div className="control-item">
                <span>{isMobile ? "Swipe gestures" : "Arrow keys"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
