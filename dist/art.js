'use strict';
// Decode isolated sprites from the original transparent atlases. Component masks
// prevent a neighbouring leaf, sail or chimney from leaking into a sprite frame.
(function () {
  const frames = Object.create(null);
  function load(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не загрузился ресурс: ' + url));
      image.src = url;
    });
  }
  function decode(image, columns, rows, names) {
    const width = image.naturalWidth, height = image.naturalHeight;
    const sheet = document.createElement('canvas');
    sheet.width = width; sheet.height = height;
    const context = sheet.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height);
    const owners = new Int32Array(width * height);
    const queue = new Int32Array(width * height);
    const candidates = new Map(); let serial = 0;
    for (let start = 0; start < owners.length; start++) {
      if (owners[start] || pixels.data[start * 4 + 3] < 96) continue;
      const id = ++serial; let head = 0, tail = 1;
      queue[0] = start; owners[start] = id;
      let minX = width, minY = height, maxX = 0, maxY = 0;
      while (head < tail) {
        const at = queue[head++], x = at % width, y = Math.floor(at / width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        const adjacent = [x ? at - 1 : -1, x + 1 < width ? at + 1 : -1,
          y ? at - width : -1, y + 1 < height ? at + width : -1];
        for (const next of adjacent) {
          if (next >= 0 && !owners[next] && pixels.data[next * 4 + 3] >= 96) {
            owners[next] = id; queue[tail++] = next;
          }
        }
      }
      if (tail < 2000) continue;
      const column = Math.min(columns - 1, Math.floor((minX + maxX) / 2 / width * columns));
      const row = Math.min(rows - 1, Math.floor((minY + maxY) / 2 / height * rows));
      const name = names[row * columns + column];
      if (!candidates.has(name) || candidates.get(name).count < tail)
        candidates.set(name, { id, count: tail, minX, minY, maxX, maxY });
    }
    for (const name of names) {
      const item = candidates.get(name);
      if (!item) throw new Error('Не распознан игровой объект: ' + name);
      const left = Math.max(0, item.minX - 3), top = Math.max(0, item.minY - 3);
      const w = Math.min(width, item.maxX + 4) - left, h = Math.min(height, item.maxY + 4) - top;
      const isolated = document.createElement('canvas'); isolated.width = w; isolated.height = h;
      const out = isolated.getContext('2d'), data = out.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const source = (top + y) * width + left + x;
        const keep = owners[source] === item.id || owners[source - 1] === item.id ||
          owners[source + 1] === item.id || owners[source - width] === item.id || owners[source + width] === item.id;
        if (keep) for (let channel = 0; channel < 4; channel++)
          data.data[(y * w + x) * 4 + channel] = pixels.data[source * 4 + channel];
      }
      out.putImageData(data, 0, 0); frames[name] = isolated;
    }
  }
  let terrain;
  const ready = Promise.all([
    load('assets/farm-atlas-v2.png'), load('assets/crops-atlas.png'), load('assets/terrain.png'), load('assets/soil.png')
  ]).then(([objects, crops, ground, soil]) => {
    decode(objects, 4, 3, ['apple','pear','pine','lilac','barn','mill','bakery','coop','cow','hen','fence','hay']);
    decode(crops, 2, 2, ['wheat','carrot','corn','berry']);
    decode(soil, 1, 1, ['soil']);
    terrain = ground;
  });
  window.FarmArt = { ready, frames, get terrain() { return terrain; },
    decorate() {
      document.querySelectorAll('canvas[data-art]').forEach(canvas => {
        const frame = frames[canvas.dataset.art]; if (!frame) return;
        const context = canvas.getContext('2d'); context.clearRect(0,0,canvas.width,canvas.height);
        const scale = Math.min(canvas.width / frame.width, canvas.height / frame.height);
        const w = frame.width * scale, h = frame.height * scale;
        context.drawImage(frame, (canvas.width - w) / 2, canvas.height - h, w, h);
      });
    }
  };
})();
