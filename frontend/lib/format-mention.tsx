import { Fragment } from "react";

export function formatMentionText(text: string) {
  const parts = text.split(/(@\w+)/g);
  return (
    <Fragment>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="text-violet-600 font-medium bg-violet-50 px-0.5 rounded"
          >
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </Fragment>
  );
}
