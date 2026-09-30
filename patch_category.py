import re

filepath = "components/summit-tracker.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = r'''                    const isCustomCat =
                      cat.id.startsWith("cat-custom-") ||
                      customCategories.some((c) => c.id === cat.id);
                    setEditingCustomExp(
                      isCustomCat
                        ? { id: "new", name: "", category_id: cat.id }
                        : { id: "new", name: "", static_category_id: cat.id },
                    );'''

replacement = r'''                    const isPseudoCat = cat.id.startsWith("cat-custom-");
                    const isCustomCat = customCategories.some((c) => c.id === cat.id);
                    setEditingCustomExp(
                      isPseudoCat
                        ? { id: "new", name: "", category_id: null, static_category_id: null }
                        : isCustomCat
                          ? { id: "new", name: "", category_id: cat.id }
                          : { id: "new", name: "", static_category_id: cat.id },
                    );'''

# Replace all occurrences by ignoring leading whitespace using regex
pattern = re.compile(r'const isCustomCat =\s*cat\.id\.startsWith\("cat-custom-"\)\s*\|\|\s*customCategories\.some\(\(c\) => c\.id === cat\.id\);\s*setEditingCustomExp\(\s*isCustomCat\s*\?\s*\{\s*id:\s*"new",\s*name:\s*"",\s*category_id:\s*cat\.id\s*\}\s*:\s*\{\s*id:\s*"new",\s*name:\s*"",\s*static_category_id:\s*cat\.id\s*\},?\s*\);', re.MULTILINE)

# Test if it finds exactly 3 matches
matches = pattern.findall(content)
print(f"Found {len(matches)} matches")

content = pattern.sub(replacement.strip(), content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
