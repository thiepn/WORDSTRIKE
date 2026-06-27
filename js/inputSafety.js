export function isTextEntryTarget(target) {
  const tagName = String(target?.tagName || "").toLowerCase();
  return ["input", "textarea", "select"].includes(tagName)
    || target?.isContentEditable === true
    || Boolean(target?.closest?.('[contenteditable="true"]'));
}
