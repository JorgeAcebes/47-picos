import re

filepath = "components/summit-tracker.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

pattern1 = re.compile(r'selected\.id\.startsWith\("exp-"\)\s*\|\|\s*selected\.id\.startsWith\("cexp-"\)')
content = pattern1.sub('isExp', content)

pattern2 = re.compile(r'item\.id\.startsWith\("exp-"\)\s*\|\|\s*item\.id\.startsWith\("cexp-"\)')
content = pattern2.sub('isExp', content)

pattern3 = re.compile(r'!item\.id\.startsWith\("exp-"\)\s*&&\s*!item\.id\.startsWith\("cexp-"\)')
content = pattern3.sub('!isExp', content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced patterns.")
