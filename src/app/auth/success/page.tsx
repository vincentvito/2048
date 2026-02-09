"use client";

import React, { useEffect } from "react";

export default function AuthSuccess(): React.ReactElement {
  useEffect(() => {
    // Signal the original tab via localStorage so it can detect the auth change
    localStorage.setItem("2048_auth_event", Date.now().toString());
    window.close();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-4xl font-extrabold text-amber-800">Logged in!</h1>
      <p className="text-amber-700 text-center">
        You can close this tab and return to your game.
      </p>
      <a
        href="/"
        className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
      >
        Or continue here
      </a>
    </div>
  );
}
