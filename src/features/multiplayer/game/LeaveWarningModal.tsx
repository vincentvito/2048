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
      <div className="modal-confirm-body">
        <h2 id="leave-warning-title" className="modal-confirm-title">
          Leave Match?
        </h2>
        <p className="modal-confirm-desc">Leaving now will count as a forfeit.</p>
        <p className="modal-confirm-desc" style={{ color: "var(--color-danger)" }}>
          Your ELO rating will decrease.
        </p>
        <div className="modal-confirm-actions">
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
