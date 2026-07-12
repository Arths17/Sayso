"use client";

export default function DashedDivider() {
  return (
    <div className="dashed-divider">
      <style>{`
        .dashed-divider {
          position: relative;
          height: 2px;
          margin: 0.875em 0;
          background-image: repeating-linear-gradient(
            to right,
            var(--color--grey-600) 0,
            var(--color--grey-600) 2px,
            transparent 2px,
            transparent 12px
          );
        }

        .dashed-divider::before,
        .dashed-divider::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 7px;
          height: 7px;
          background-color: var(--color--primary-blue);
        }

        .dashed-divider::before {
          left: 0;
        }

        .dashed-divider::after {
          right: 0;
        }
      `}</style>
    </div>
  );
}
