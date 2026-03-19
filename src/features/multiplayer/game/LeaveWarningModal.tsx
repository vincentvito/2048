"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface LeaveWarningModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LeaveWarningModal({ show, onCancel, onConfirm }: LeaveWarningModalProps) {
  return (
    <Modal open={show} onClose={onCancel} labelledBy="leave-warning-title">
      <div style={{ textAlign: "center", padding: "4px 0" }}>
        <h2
          id="leave-warning-title"
          style={{ margin: "0 0 12px", fontSize: "1.4rem", color: "var(--text-primary)" }}
        >
          Leave Match?
        </h2>
        <p style={{ margin: "0 0 8px", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Leaving now will count as a forfeit.
        </p>
        <p style={{ margin: "0 0 20px", color: "var(--color-danger)", fontSize: "0.9rem", fontWeight: 500 }}>
          Your ELO rating will decrease.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Button variant="secondary" onClick={onCancel}>
            Keep Playing
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Leave &amp; Forfeit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
