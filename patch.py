import re
with open('app/globals.css', 'r', encoding='utf-8') as f:
    c = f.read()

target = r'''/* Experiences specific zooms: they appear earlier */
.mode-experiences .map[data-zoom="3"] .summit-pin--experience,
.mode-experiences .map[data-zoom="4"] .summit-pin--experience {
  opacity: 0.6;
  pointer-events: auto;
  transform: scale(0.7);
}

.mode-experiences .map[data-zoom="5"] .summit-pin--experience,
.mode-experiences .map[data-zoom="6"] .summit-pin--experience,
.mode-experiences .map[data-zoom="7"] .summit-pin--experience {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1.1);
}'''

replacement = r'''/* Experiences specific zooms: they appear earlier */
.mode-experiences .map[data-zoom="1"] .summit-pin--experience,
.mode-experiences .map[data-zoom="2"] .summit-pin--experience,
.mode-experiences .map[data-zoom="3"] .summit-pin--experience,
.mode-experiences .map[data-zoom="4"] .summit-pin--experience {
  opacity: 0.8;
  pointer-events: auto;
  transform: scale(0.85);
}

.mode-experiences .map[data-zoom="5"] .summit-pin--experience,
.mode-experiences .map[data-zoom="6"] .summit-pin--experience,
.mode-experiences .map[data-zoom="7"] .summit-pin--experience {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1.1);
}'''

c = re.sub(target.replace('\n', r'\r?\n'), replacement.replace('\n', '\n'), c)

with open('app/globals.css', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')
