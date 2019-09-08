"use strict";

if (typeof AFRAME === 'undefined') {
    throw 'AFRAME is not loaded.';
}

AFRAME.registerComponent('xycontainer', {
    dependencies: ['xyrect'],
    schema: {
        width: { type: 'number', default: 1.0 },
        height: { type: 'number', default: 1.0 },
        spacing: { type: 'number', default: 0.05 },
        padding: { type: 'number', default: 0 },
        reverse: { type: 'boolean', default: false },
        direction: { type: 'string', default: "vertical", oneOf: ['', 'row', 'column', 'vertical', 'horizontal'] },
        alignItems: { type: 'string', default: "", oneOf: ['', 'center', 'start', 'end', 'baseline', 'stretch'] },
        justifyItems: { type: 'string', default: "start", oneOf: ['center', 'start', 'end', 'space-between', 'space-around', 'stretch'] },
    },
    update: function () {
        this.doLayout(this.data.width, this.data.height);
        this.el.setAttribute("xyrect", { width: this.data.width, height: this.data.height });
    },
    doLayout: function (w, h) {
        if (this.data.direction === "") {
            return;
        }
        var children = this.el.children;
        var vertical = this.data.direction === "vertical" || this.data.direction === "column";
        var containerRect = this.el.components.xyrect;
        var containerSizeCross = (vertical ? w : h) - this.data.padding * 2;
        var containerSize = (vertical ? h : w) - this.data.padding * 2;
        var containerPivotCross = vertical ? containerRect.data.pivotX : containerRect.data.pivotY;
        var spacing = this.data.spacing;
        var stretchFactor = 0;
        var p = vertical ? ((containerRect.data.pivotY - 1) * h) : (- containerRect.data.pivotX * w);
        p += this.data.padding;
        var getItemData = (el) => {
            var rect = el.components.xyrect || {
                width: el.getAttribute("width") * 1,
                height: el.getAttribute("height") * 1
            };
            var childScale = el.getAttribute("scale") || { x: 1, y: 1 };
            return vertical ? ({
                sizeMain: rect.height,
                sizeCross: rect.width,
                pivotMain: rect.data ? rect.data.pivotY : 0.5,
                pivotCross: rect.data ? rect.data.pivotX : 0.5,
                scaleMain: childScale.y,
                scaleCross: childScale.x
            }) : ({
                sizeMain: rect.width,
                sizeCross: rect.height,
                pivotMain: rect.data ? rect.data.pivotX : 0.5,
                pivotCross: rect.data ? rect.data.pivotY : 0.5,
                scaleMain: childScale.x,
                scaleCross: childScale.y
            });
        };
        if (this.data.justifyItems !== "start") {
            // update: stretchFactor, spacing, p
            var itemCount = 0;
            var sizeSum = 0;
            var growSum = 0;
            var shrinkSum = 0;
            for (var i = 0; i < children.length; i++) {
                var item = children[i];
                var layoutItem = item.components.xyitem;
                if (layoutItem && layoutItem.data.fixed) {
                    continue;
                }
                itemCount++;
                var itemData = getItemData(item);
                sizeSum += itemData.sizeMain * itemData.scaleMain;
                growSum += layoutItem ? layoutItem.data.grow : 1;
                shrinkSum += layoutItem ? layoutItem.data.shrink : 1;
            }
            if (itemCount == 0) {
                return;
            }
            if (this.data.justifyItems === "center") {
                p += (containerSize - sizeSum - spacing * itemCount) / 2;
            } else if (this.data.justifyItems === "end") {
                p += (containerSize - sizeSum - spacing * itemCount);
            } else if (this.data.justifyItems === "stretch") {
                stretchFactor = containerSize - sizeSum - spacing * (itemCount - 1);
                if (stretchFactor > 0) {
                    stretchFactor = growSum > 0 ? stretchFactor / growSum : 0;
                } else {
                    stretchFactor = shrinkSum > 0 ? stretchFactor / shrinkSum : 0;
                }
            } else if (this.data.justifyItems === "space-between") {
                spacing = (containerSize - sizeSum) / (itemCount - 1);
            } else if (this.data.justifyItems === "space-around") {
                spacing = (containerSize - sizeSum) / itemCount;
                p += spacing * 0.5;
            }
        }

        for (var i = 0; i < children.length; i++) {
            var item = children[i];
            var layoutItem = item.components.xyitem;
            if (layoutItem && layoutItem.data.fixed || item.classList.contains("xy-ignorelayout")) {
                continue; // xy-ignorelayout: DEPRECATED
            }
            var align = (layoutItem && layoutItem.data.align) || this.data.alignItems;
            var stretch = (layoutItem ? (stretchFactor > 0 ? layoutItem.data.grow : layoutItem.data.shrink) : 1) * stretchFactor;
            var itemData = getItemData(item);
            if (itemData.scaleMain > 0 && stretch != 0) {
                item.setAttribute(vertical ? "height" : "width", itemData.sizeMain + stretch / itemData.scaleMain);
            }
            if (itemData.scaleCross > 0 && align === "stretch") {
                item.setAttribute(vertical ? "width" : "height", containerSizeCross / itemData.scaleCross);
            }
            var pos = item.getAttribute("position") || { x: 0, y: 0, z: 0 };
            var sz = itemData.sizeMain * itemData.scaleMain + stretch;
            var posMain = (this.data.reverse ^ vertical) ? - (p + (1 - itemData.pivotMain) * sz) : p + itemData.pivotMain * sz;
            var posCross = null;
            if (align === "start") {
                posCross = - (containerPivotCross * containerSizeCross - itemData.pivotCross * itemData.sizeCross);
            } else if (align === "end") {
                posCross = (containerPivotCross * containerSizeCross - itemData.pivotCross * itemData.sizeCross);
            } else if (align === "stretch") {
                posCross = - (containerPivotCross * containerSizeCross - itemData.pivotCross * containerSizeCross);
            } else if (align === "center") {
                posCross = (itemData.pivotCross - 0.5) * itemData.sizeCross;
            } else if (align === "baseline") {
                posCross = 0;
            }
            if (vertical) {
                pos.y = posMain;
                pos.x = posCross !== null ? posCross : pos.x;
            } else {
                pos.x = posMain;
                pos.y = posCross !== null ? posCross : pos.y;
            }
            item.setAttribute("position", pos);
            p += sz + spacing;
        }
    },
    requestLayoutUpdate: function () {
        this.doLayout(this.data.width, this.data.height);
    }
});

AFRAME.registerComponent('xyitem', {
    schema: {
        align: { type: 'string', default: "", oneOf: ['', 'center', 'start', 'end', 'baseline', 'stretch'] },
        grow: { type: 'number', default: 1 },
        shrink: { type: 'number', default: 1 },
        fixed: { type: 'boolean', default: false }
    },
    update: function (oldData) {
        if (oldData.align !== undefined && this.el.parent.components.xycontainer) {
            this.el.parent.components.xycontainer.requestLayoutUpdate();
        }
    }
});

AFRAME.registerComponent('xyrect', {
    dependencies: ['position'],
    schema: {
        width: { type: 'number', default: -1 }, // -1 : auto
        height: { type: 'number', default: -1 },
        pivotX: { type: 'number', default: 0.5 },
        pivotY: { type: 'number', default: 0.5 }
    },
    init: function () {
        this.height = 0;
        this.width = 0;
    },
    update: function (oldData) {
        if (this.el.components.rounded || this.el.tagName == "A-INPUT") {
            // hack for a-frame-material
            this.data.pivotX = 0;
            this.data.pivotY = 0;
        }
        if (this.data.width >= 0) {
            this.width = this.data.width;
        } else if (this.el.hasAttribute("width")) {
            this.width = this.el.getAttribute("width") * 1;
        }
        if (this.data.height >= 0) {
            this.height = this.data.height;
        } else if (this.el.hasAttribute("height")) {
            this.height = this.el.getAttribute("height") * 1;
        }
        if (oldData.width !== undefined) {
            this.el.dispatchEvent(new CustomEvent('xyresize', { detail: { xyrect: this } }));
        }
    }
});

AFRAME.registerComponent('xyclipping', {
    dependencies: ['xyrect'],
    schema: {
        exclude: { type: 'selector', default: null },
        clipTop: { type: 'boolean', default: true },
        clipBottom: { type: 'boolean', default: true },
        clipLeft: { type: 'boolean', default: false },
        clipRight: { type: 'boolean', default: false }
    },
    init: function () {
        this.el.sceneEl.renderer.localClippingEnabled = true;
        this.clippingPlanesLocal = [];
        this.clippingPlanes = [];
        this.exclude = this.data.exclude;
        this.currentMatrix = null;
        this.el.classList.add("clickable");
        this._filterEvent = this._filterEvent.bind(this);
        this.filterTargets = ['click', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove'];
        this.filterTargets.forEach(t => this.el.addEventListener(t, this._filterEvent, true));
    },
    update: function () {
        this.clippingPlanes = [];
        this.clippingPlanesLocal = [];
        var rect = this.el.components.xyrect;
        if (this.data.clipBottom) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
        if (this.data.clipTop) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), rect.height));
        if (this.data.clipLeft) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
        if (this.data.clipRight) this.clippingPlanesLocal.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), rect.width));
        this.updateMatrix();
    },
    remove: function () {
        this.filterTargets.forEach(t => this.el.removeEventListener(t, this._filterEvent, true));
        this.clippingPlanes = [];
        this.applyClippings();
    },
    tick: function () {
        if (!this.el.object3D.matrixWorld.equals(this.currentMatrix)) {
            this.updateMatrix();
        }
    },
    _filterEvent: function (ev) {
        if (!ev.path.includes(this.data.exclude)) {
            if (ev.detail.intersection && this.isClipped(ev.detail.intersection.point)) {
                ev.stopPropagation();
                if (ev.detail.cursorEl && ev.detail.cursorEl.components.raycaster) {
                    let targets = ev.detail.cursorEl.components.raycaster.intersectedEls;
                    let c = targets.lastIndexOf(ev.target);
                    if (c >= 0 && c + 1 < targets.length) {
                        targets[c + 1].dispatchEvent(new CustomEvent(ev.type, ev));
                    }
                }
            }
        }
    },
    updateMatrix: function () {
        this.currentMatrix = this.el.object3D.matrixWorld.clone();
        for (var i = 0; i < this.clippingPlanesLocal.length; i++) {
            this.clippingPlanes[i] = this.clippingPlanesLocal[i].clone().applyMatrix4(this.currentMatrix);
        }
        this.applyClippings();
    },
    applyClippings: function () {
        let excludeObj = this.exclude.object3D;
        let setCliping = (obj) => {
            if (obj === excludeObj) return;
            if (obj.material && obj.material.clippingPlanes !== undefined) {
                obj.material.clippingPlanes = this.clippingPlanes;
            }
            for (var i = 0; i < obj.children.length; i++) {
                setCliping(obj.children[i]);
            }
        };
        setCliping(this.el.object3D);
    },
    isClipped: function (p) {
        return this.clippingPlanes.some(plane => plane.distanceToPoint(p) < 0);
    }
});

AFRAME.registerPrimitive('a-xylayout', {
    defaultComponents: {
        xycontainer: {},
        xyrect: {}
    },
    mappings: {
        width: 'xycontainer.width',
        height: 'xycontainer.height',
        direction: 'xycontainer.direction',
        spacing: 'xycontainer.spacing',
        padding: 'xycontainer.padding',
        reverse: 'xycontainer.reverse',
        "align-items": 'xycontainer.alignItems',
        "justify-items": 'xycontainer.justifyItems'
    }
});
