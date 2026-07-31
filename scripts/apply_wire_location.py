from pathlib import Path

path = Path("src/services/api/wire.ts")
text = path.read_text()
old = '''    width: optionalPositiveInteger(value, "width"),
    height: optionalPositiveInteger(value, "height"),
    uploadProgress:
      progress >= 0 && progress <= 1 ? progress : undefined,
    status
  };'''
new = '''    width: optionalPositiveInteger(value, "width"),
    height: optionalPositiveInteger(value, "height"),
    latitude: numberOrDefault(value, Number.NaN, "latitude"),
    longitude: numberOrDefault(value, Number.NaN, "longitude"),
    accuracyRadiusMeters: optionalPositiveInteger(
      value,
      "accuracyRadiusMeters",
      "accuracy_radius_meters"
    ),
    uploadProgress:
      progress >= 0 && progress <= 1 ? progress : undefined,
    status
  };'''
if text.count(old) != 1:
    raise SystemExit(f"Expected one attachment return block, found {text.count(old)}")
text = text.replace(old, new, 1)
# Remove non-finite coordinates rather than leaking NaN into the UI.
old_return = '''  return {
    id: requireBoundedString(value, "Identifiant pièce jointe", 256, "id"),'''
new_return = '''  const latitude = numberOrDefault(value, Number.NaN, "latitude");
  const longitude = numberOrDefault(value, Number.NaN, "longitude");
  return {
    id: requireBoundedString(value, "Identifiant pièce jointe", 256, "id"),'''
if text.count(old_return) != 1:
    raise SystemExit("Attachment return opening mismatch")
text = text.replace(old_return, new_return, 1)
text = text.replace(
    '    latitude: numberOrDefault(value, Number.NaN, "latitude"),\n    longitude: numberOrDefault(value, Number.NaN, "longitude"),',
    '    latitude: Number.isFinite(latitude) ? latitude : undefined,\n    longitude: Number.isFinite(longitude) ? longitude : undefined,',
    1,
)
path.write_text(text)
