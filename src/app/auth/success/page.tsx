"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function AuthSuccess(): React.ReactElement {
  useEffect(() => {
    // Signal the original tab via localStorage so it can detect the auth change
    localStorage.setItem("2048_auth_event", Date.now().toString());
    window.close();
  }, []);

  return (
    <div className="auth-success">
      <h1>Logged in!</h1>
      <p>You can close this tab and return to your game.</p>
      <Link href="/" className="auth-success-link">
        Or continue here
      </Link>
    </div>
  );
}
