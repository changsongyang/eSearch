import { button, ele, frame, input, select, view } from "dkh-ui";
import type { setting } from "../../ShareTypes";
import store from "../../../lib/store/renderStore";
const { ipcRenderer } = window.require("electron") as typeof import("electron");

const pz = store.get("高级图片编辑.配置");
const styleData: Omit<setting["高级图片编辑"]["配置"][0], "name"> = pz.find(
    (i) => i.name === store.get("高级图片编辑.默认配置"),
) || {
    raduis: 0,
    background: "",
    "shadow.x": 0,
    "shadow.y": 0,
    "shadow.blur": 0,
    "shadow.color": "rgba(0,0,0,0.5)",
    "padding.x": 0,
    "padding.y": 0,
    autoPadding: false,
};

const preview = view();
const controls = frame("sidebar", {
    _: view("y"),
    configs: {
        _: view("x"),
        select: select(
            [{ value: "", name: "添加" }].concat(
                pz.map((i) => ({ value: i.name, name: i.name })),
            ),
        ),
        addConf: button("添加配置"),
        delConf: button("删除配置"),
    },
    controls: {
        _: view("y"),
        raduis: input("number"),
        background: {
            _: view("x"),
            bgText: input(),
        },
        shardow: {
            _: view("x"),
            sx: input("number"),
            sy: input("number"),
            blur: input("number"),
            scolor: input(),
        },
        padding: {
            _: view("x"),
            px: input("number"),
            py: input("number"),
        },
    },
});
const canvas = ele("canvas");

preview.add(canvas);

const configMap: Partial<
    Record<
        keyof typeof controls.els,
        { path: keyof typeof styleData; parse?: (v: string) => unknown }
    >
> = {
    raduis: { path: "raduis", parse: Number },
    bgText: { path: "background" },
    sx: { path: "shadow.x", parse: Number },
    sy: { path: "shadow.y", parse: Number },
    blur: { path: "shadow.blur", parse: Number },
    scolor: { path: "shadow.color" },
    px: { path: "padding.x", parse: Number },
    py: { path: "padding.y", parse: Number },
};

let photo: HTMLImageElement | null = null;

function setConfig() {
    for (const key in configMap) {
        const k = key as keyof typeof configMap;
        const el = controls.els[k];
        el.sv(String(styleData[configMap[k].path]));
    }
}

function updatePreview() {
    if (photo) {
        const ctx = canvas.el.getContext("2d");

        const { naturalWidth: photoWidth, naturalHeight: photoHeight } = photo;
        const { raduis, background } = styleData;
        const {
            "shadow.x": x,
            "shadow.y": y,
            "shadow.blur": blur,
            "shadow.color": color,
        } = styleData;
        const { x: padX, y: padY } = styleData.autoPadding
            ? { x: 0, y: 0 }
            : { x: styleData["padding.x"], y: styleData["padding.y"] };

        const finalWidth = photoWidth + 2 * padX;
        const finalHeight = photoHeight + 2 * padY;

        canvas.el.width = finalWidth;
        canvas.el.height = finalHeight;

        if (background) {
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, finalWidth, finalHeight);
        }

        // Draw the photo
        ctx.beginPath();
        ctx.roundRect(padX, padY, photoWidth, photoHeight, raduis);
        ctx.clip();
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowOffsetX = x;
        ctx.shadowOffsetY = y;
        ctx.shadowBlur = blur;
        ctx.shadowColor = color;
        ctx.drawImage(photo, padX, padY);
        ctx.restore();
    }
}

document.body.appendChild(controls.el.el);
document.body.appendChild(preview.el);

for (const key in configMap) {
    const k = key as keyof typeof configMap;
    const el = controls.els[k];
    el.on("input", () => {
        const v = el.gv as string;
        if (configMap[k].parse) {
            styleData[configMap[k].path as string] = configMap[k].parse(v);
        } else {
            styleData[configMap[k].path as string] = v;
        }
        updatePreview();
        controls.els.select.sv("");
    });
}

setConfig();

ipcRenderer.on("img", (_e, data: string) => {
    const img = new Image();
    img.onload = () => {
        photo = img;
        updatePreview();
    };
    img.src = data;
});

updatePreview();
