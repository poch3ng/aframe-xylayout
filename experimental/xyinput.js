"use strict";

AFRAME.registerComponent('xyinput', {
    dependencies: ['xylabel'],
    schema: {
        value: { default: "" },
        valueType: { default: "" },
        placeholder: { default: "" },
        caretColor: { default: "#0088ff" },
        bgColor: { default: "white" },
        softwareKeyboard: { default: true },
    },
    init() {
        let data = this.data, el = this.el, xyrect = el.components.xyrect;
        this.caretObj_ = new THREE.Mesh(
            new THREE.PlaneGeometry(0.04, xyrect.height * 0.9),
            new THREE.MeshBasicMaterial({ color: this.data.caretColor }));
        this.el.object3D.add(this.caretObj_);
        this.caretObj_.position.z = 0.02;

        Object.defineProperty(el, 'value', {
            get: () => data.value,
            set: (v) => el.setAttribute('xyinput', 'value', "" + v)
        });

        el.classList.add('collidable');
        el.setAttribute('tabindex', 0);
        el.setAttribute('geometry', {
            primitive: 'xy-rounded-rect', width: xyrect.width, height: xyrect.height
        });
        el.addEventListener('xyresize', (ev) => {
            el.setAttribute('geometry', { width: ev.detail.xyrect.width, height: ev.detail.xyrect.height });
        });
        el.setAttribute('material', { color: data.bgColor });
        el.addEventListener('click', ev => {
            el.focus();
            if (data.softwareKeyboard) {
                let kbd = document.querySelector("[xykeyboard]");
                if (kbd) {
                    kbd.components.xykeyboard.show(data.valueType);
                }
            }
            if (ev.detail.intersection) {
                let min = 0, max = this.el.value.length + 1, p = max;
                let v = ev.detail.intersection.uv.x;
                while (max - min >= 2) {
                    p = min + ((max - min) / 2 | 0);
                    if (this.caretpos_(p) < v) {
                        min = p;
                    } else {
                        max = p;
                    }
                }
                this.cursor = p;
                this.update();
            }
        });
        el.addEventListener('blur', (ev) => this.update());
        el.addEventListener('focus', (ev) => this.update());
        el.addEventListener('keypress', ev => {
            if (ev.code == 'Enter') return;
            let pos = this.cursor, s = el.value;
            this.cursor += ev.key.length;
            el.value = s.slice(0, pos) + ev.key + s.slice(pos);
        });
        this.oncopy_ = (ev) => {
            if (document.activeElement == el) {
                ev.clipboardData.setData('text/plain', el.value);
                ev.preventDefault();
            }
        };
        this.onpaste_ = (ev) => {
            if (document.activeElement == el) {
                let pos = this.cursor, s = el.value;
                let t = ev.clipboardData.getData('text/plain');
                this.cursor += t.length;
                el.value = s.slice(0, pos) + t + s.slice(pos);
                ev.preventDefault();
            }
        };
        window.addEventListener('copy', this.oncopy_);
        window.addEventListener('paste', this.onpaste_);

        el.addEventListener('keydown', ev => {
            let pos = this.cursor, s = el.value;
            if (ev.code == 'ArrowLeft') {
                if (pos > 0) {
                    this.cursor--;
                    this.update();
                }
            } else if (ev.code == 'ArrowRight') {
                if (pos < s.length) {
                    this.cursor++;
                    this.update();
                }
            } else if (ev.code == 'Backspace') {
                if (pos > 0) {
                    this.cursor--;
                    el.value = s.slice(0, pos - 1) + s.slice(pos);
                }
            }
        });
    },
    update(oldData) {
        let s = this.el.value;
        if (this.cursor > s.length || oldData && (oldData.value == null || this.lastcursor_ == oldData.value.length)) {
            this.cursor = s.length;
        }
        if (this.data.valueType == 'password') {
            s = s.replace(/./g, '*');
        }
        if (s == "") {
            s = this.data.placeholder;
            this.el.setAttribute('xylabel', 'color', "#aaa");
        } else {
            this.el.setAttribute('xylabel', 'color', "black");
        }
        this.el.setAttribute('xylabel', 'value', s);
        this.lastcursor_ = this.cursor;
        this.caretObj_.visible = false;
        if (document.activeElement == this.el) {
            setTimeout(() => {
                this.caretObj_.position.x = this.caretpos_(this.cursor);
                this.caretObj_.visible = true;
            }, 0);
        }
    },
    caretpos_(cursor) {
        let xylabel = this.el.components.xylabel, xyrect = this.el.components.xyrect;
        let s = this.el.value;
        let pos = 0; // [0,1]
        if (cursor == 0) {
        } else if (xylabel.canvas) {
            let ctx = xylabel.canvas.getContext('2d');
            pos = ctx.measureText(s.slice(0, cursor)).width / xylabel.textWidth;
        } else if (this.el.components.text) {
            let textLayout = this.el.components.text.geometry.layout;
            let glyphs = textLayout.glyphs;
            let p = Math.max(0, cursor - (s.length - glyphs.length)); // spaces...
            let g = glyphs[Math.min(p, glyphs.length - 1)];
            let gpos = g ? g.position[0] + g.data.width * (p >= glyphs.length ? 1 : 0.1) : 0;
            pos = gpos / textLayout.width;
        }
        return (pos - 0.5) * xyrect.width + 0.04;
    },
    remove() {
        window.removeEventListener('copy', this.oncopy_);
        window.removeEventListener('paste', this.onpaste_);
    }
});

AFRAME.registerComponent('xykana', {
    schema: {
        label: { default: null, type: 'selector' }
    },
    table: {
        'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
        'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
        'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
        'sa': 'さ', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
        'za': 'ざ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
        'ta': 'た', 'ti': 'ち', 'tu': 'つ', 'te': 'て', 'to': 'と',
        'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
        'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
        'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
        'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
        'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
        'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
        'ya': 'や', 'yi': 'い', 'yu': 'ゆ', 'ye': 'いぇ', 'yo': 'よ',
        'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
        'wa': 'わ', 'wi': 'うぃ', 'wu': 'う', 'we': 'うぇ', 'wo': 'を',
        'xa': 'ぁ', 'xi': 'ぃ', 'xu': 'ぅ', 'xe': 'ぇ', 'xo': 'ぉ',
        'xya': 'ゃ', 'xyi': 'ぃ', 'xyu': 'ゅ', 'xye': 'ぇ', 'xyo': 'ょ',
        'xtu': 'っ', 'nn': 'ん', 'wyi': 'ゐ', 'wye': 'ゑ',
        'fu': 'ふ', 'vu': 'ヴ', 'tsu': 'つ',
        'chi': 'ち', 'ji': 'じ', 'shi': 'し',
        '-': 'ー'
    },
    init() {
        this.onkeydown_ = this.onkeydown_.bind(this);
        document.body.addEventListener('keydown', this.onkeydown_, true);
        document.body.addEventListener('keypress', this.onkeydown_, true);
        this.kana = "";
        this.suggestions = [];
        this.suggestionIdx = 0;
        this.enable = false;
        this.convert = async (str) => {
            // https://www.google.co.jp/ime/cgiapi.html
            let response = await fetch(`https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${str},`);
            let result = await response.json();
            this.suggestions = result[0][1];
            this.suggestionIdx = 0;
            this.kana = result[0][1][0];
            this.data.label.setAttribute('value', this.kana);
        };
    },
    onkeydown_(ev) {
        if (ev.code == 'CapsLock' && ev.shiftKey || ev.key == 'HiraganaKatakana') {
            this.enable = !this.enable;
            this.confirm_(ev.target);
            return;
        }
        if (!this.enable || !ev.code) {
            return;
        }
        if (ev.type == 'keypress') {
            if (this.suggestions.length > 0) {
                if (ev.code == 'Space') {
                    this.suggestionIdx = (this.suggestionIdx + 1) % this.suggestions.length;
                    this.kana = this.suggestions[this.suggestionIdx];
                    this.data.label.setAttribute('value', this.kana);
                    ev.stopPropagation();
                    return;
                }
                this.confirm_(ev.target);
            }
            this.suggestions = [];
            if (ev.key.match(/^[a-z-]$/)) {
                this.kana += ev.key;
                let temp = this.kana.replace(/l([aiueo])/g, "x$1")
                    .replace(/n([ksthmyrwgzbpdjfv])/g, "nn$1")
                    .replace(/([ksthmyrwgzbpdjfv])\1/g, "xtu$1")
                    .replace(/([kstnhmrgzbpdjf])y([aiueo])/g, "$1ixy$2")
                    .replace(/(j|ch|sh)([aueo])/g, "$1ixy$2")
                    .replace(/(f|v|ts)([aieo])/g, "$1ux$2");
                for (let p = 0; p < temp.length; p++) {
                    for (let l = 3; l >= 0; l--) {
                        let t = this.table[temp.slice(p, p + l)];
                        if (t) {
                            temp = temp.slice(0, p) + t + temp.slice(p + l);
                            break;
                        }
                    }
                }
                this.kana = temp;
                ev.stopPropagation();
            } else if (ev.code == 'Space' && this.kana) {
                this.convert(this.kana);
                this.kana = "";
                ev.stopPropagation();
            } else if (this.kana) {
                this.kana += ev.key;
                ev.stopPropagation();
            }
        } else if (this.kana) {
            if (ev.code == 'Enter') {
                this.confirm_(ev.target);
            } else if (ev.code == 'Backspace') {
                this.kana = this.kana.slice(0, -1);
            }
            ev.stopPropagation();
        }
        this.data.label.setAttribute('value', this.kana);
    },
    remove() {
        document.body.removeEventListener('keydown', this.onkeydown_, true);
        document.body.removeEventListener('keypress', this.onkeydown_, true);
    },
    confirm_(target) {
        if (this.kana) {
            target.dispatchEvent(new KeyboardEvent('keypress', { key: this.kana }));
            this.kana = "";
        }
        this.suggestions = [];
        this.data.label.setAttribute('value', this.kana);
    }
});

AFRAME.registerComponent('xykeyboard', {
    schema: {
        type: { default: "" },
        keyPitch: { default: 0.2 },
        kana: { default: false },
    },
    blocks: {
        main: {
            size: [11, 4],
            rows: [
                { position: [0, 3], keys: ["qQ!", "wW@", "eE#", "rR$", "tT%", "yY^", "uU&", "iI*", "oO(", "pP)", "-_="] },
                { position: [0, 2], keys: ["aA1", "sS2", "dD3", "fF4", "gG5", "hH`", "jJ~", "kK+", "lL[", ":;]"] },
                { position: [0, 1], keys: [{ code: "Shift", symbols: "⇧⬆" }, "zZ6", "xX7", "cC8", "vV9", "bB0", "nN{", "mM}", ",'<", ".\">", "/?\\"] },
                { position: [0, 0], keys: [{ code: "Space", key: " ", label: "_", size: 4 }] },
                { position: [-4.5, 0], keys: [{ code: "_Fn", label: "#!" }, { code: "HiraganaKatakana", label: "あ" }] },
            ]
        },
        num: {
            size: [4, 4],
            rows: [
                { position: [0, 3], keys: ["7", "8", "9", "/"] },
                { position: [0, 2], keys: ["4", "5", "6", "*"] },
                { position: [0, 1], keys: ["1", "2", "3", "-"] },
                { position: [0, 0], keys: ["0", ":", ".", "+"] },
            ]
        },
        ctrl: {
            size: [2, 4],
            rows: [
                { position: [0, 3], keys: [{ code: 'Backspace', label: "⌫", size: 2 }] },
                { position: [0, 2], keys: [{ code: 'Space', key: " ", label: "SP", size: 2 }] },
                { position: [0, 1], keys: [{ code: 'Enter', label: "⏎", size: 2 }] },
                { position: [1.3, 3.5], keys: [{ code: '_Close', label: "x", size: 0.8 }] },
                { position: [0, 0], keys: [{ code: 'ArrowLeft', label: "⇦" }, { code: 'ArrowRight', label: "⇨" }] },
            ]
        }
    },
    show(type) {
        this.target = null;
        this.keyidx = 0;
        this.hide();
        let excludes = this.data.kana ? [] : ['HiraganaKatakana'];
        if (type == 'number') {
            let w = this.blocks.num.size[0] + this.blocks.ctrl.size[0];
            this.createKeys_(this.blocks.num, this.data.keyPitch);
            this.createKeys_(this.blocks.ctrl, this.data.keyPitch).setAttribute('position', 'x', (w / 2 + 0.4) * this.data.keyPitch);
        } else if (type == 'full') {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this.createKeys_(this.blocks.main, this.data.keyPitch, excludes);
            this.createKeys_(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute('position', 'x', (w / 2 + 0.4) * this.data.keyPitch);
            w += this.blocks.ctrl.size[0] + this.blocks.num.size[0];
            this.createKeys_(this.blocks.num, this.data.keyPitch).setAttribute('position', 'x', (w / 2 + 0.8) * this.data.keyPitch);
        } else {
            let w = this.blocks.main.size[0] + this.blocks.ctrl.size[0];
            this.createKeys_(this.blocks.main, this.data.keyPitch, excludes);
            this.createKeys_(this.blocks.ctrl, this.data.keyPitch, ["Space"]).setAttribute('position', 'x', (w / 2 + 0.4) * this.data.keyPitch);
        }
        if (this.data.kana) {
            let convText = document.createElement("a-xylabel");
            convText.setAttribute('color', "yellow");
            convText.setAttribute('mode', "canvas");
            convText.setAttribute('position', { x: 0, y: 2 * this.data.keyPitch * 0.95, z: 0.03 });
            convText.setAttribute('xyrect', { width: 8 * this.data.keyPitch, height: this.data.keyPitch * 0.6 });
            convText.setAttribute('xykana', { label: convText });
            this.el.appendChild(convText);
        }
        this.el.setAttribute('xy-drag-control', 'draggable', '.xyinput-close');
    },
    hide() {
        this.el.removeAttribute('xy-drag-control');
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },
    createKeys_(block, sz, excludes = []) {
        let pane = document.createElement('a-entity');
        let padding = sz * 0.3;
        pane.setAttribute('geometry', {
            primitive: "xy-rounded-rect", width: block.size[0] * sz + padding, height: block.size[1] * sz + padding
        });
        pane.setAttribute("material", {
            color: "#222233"
        });
        for (let row of block.rows) {
            let keyrow = document.createElement('a-xycontainer');
            keyrow.setAttribute('direction', 'row');
            keyrow.setAttribute('spacing', 0);
            keyrow.setAttribute('position', { x: row.position[0] * sz, y: row.position[1] * sz - (block.size[1] - 1) * sz / 2, z: 0.02 });
            for (let key of row.keys) {
                if (key.code && excludes.includes(key.code)) {
                    continue;
                }
                let keyEl = document.createElement('a-xybutton');
                keyEl.setAttribute('xyrect', { width: (key.size || 1) * sz, height: sz });
                keyEl.setAttribute('material', {
                    visible: false
                });
                keyrow.appendChild(keyEl);
                let label = key.label || key.code;
                if (key.symbols || typeof key === 'string') {
                    keyEl.classList.add('xyinput-key');
                    keyEl.dataset.keySymbols = key.symbols || key;
                    label = keyEl.dataset.keySymbols[0];
                }
                keyEl.setAttribute('xylabel', { value: label, align: 'center' });
                keyEl.addEventListener('mouseenter', () => keyEl.setAttribute('material', 'visible', true));
                keyEl.addEventListener('mouseleave', () => keyEl.setAttribute('material', 'visible', false));

                if (key.code == '_Close') {
                    keyEl.classList.add('xyinput-close');
                    keyEl.addEventListener('click', ev => this.hide());
                }
                keyEl.addEventListener('mousedown', ev => {
                    if (document.activeElement == document.body && this.target) {
                        this.target.focus();
                    }
                    this.target = document.activeElement;
                    setTimeout(() => this.target.focus(), 0);
                    ev.preventDefault();

                    if (key.code == '_Fn') {
                        this.keyidx = this.keyidx == 2 ? 0 : 2;
                        this.updateSymbols_();
                        return;
                    }
                    if (key.code == 'Shift') {
                        this.keyidx = (this.keyidx + 1) % 2;
                        this.updateSymbols_();
                    }

                    if (document.activeElement != document.body) {
                        let keydata = typeof key == 'string' ? { key: key } : key;
                        let k = keydata.key ? keydata.key[this.keyidx] || keydata.key[0] : keydata.code;
                        let eventdata = { key: k, code: keydata.code || "Key" + keydata.key[0].toUpperCase() };
                        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', eventdata));
                        if (keydata.key) {
                            document.activeElement.dispatchEvent(new KeyboardEvent('keypress', eventdata));
                        }
                    }
                });
            }
            pane.appendChild(keyrow);
        }
        this.el.appendChild(pane);
        return pane;
    },
    updateSymbols_() {
        for (let keyEl of this.el.querySelectorAll('.xyinput-key')) {
            let s = keyEl.dataset.keySymbols;
            keyEl.setAttribute('xylabel', 'value', s[this.keyidx] || s[0]);
        }
    },
    remove() {
    }
});

AFRAME.registerPrimitive('a-xykeyboard', {
    defaultComponents: {
        xykeyboard: {},
        rotation: { x: -20, y: 0, z: 0 }
    },
    mappings: {
        kana: 'xykeyboard.kana',
        type: 'xykeyboard.type',
        'physical-keys': 'xykeyboard.physicalKeys'
    }
});

AFRAME.registerPrimitive('a-xyinput', {
    defaultComponents: {
        xyrect: { width: 2, height: 0.5 },
        xylabel: {},
        xyinput: {}
    },
    mappings: {
        width: 'xyrect.width',
        height: 'xyrect.height',
        value: 'xyinput.value',
        type: 'xyinput.valueType',
        placeholder: 'xyinput.placeholder',
        'caret-color': 'xyinput.caretColor',
        'background-color': 'xyinput.bgColor'
    }
});
