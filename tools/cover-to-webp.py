#!/usr/bin/env python3
# 封面图转换脚本：把 source/images 下的 jpg/png 封面转成 webp
# 用法:
#   python3 tools/cover-to-webp.py                  # 转换 source/images 下所有 jpg/png
#   python3 tools/cover-to-webp.py a.jpg b.png ...  # 只转换指定文件
# 约定:
#   - 输出统一为 webp(quality 82)，宽度超过 1600 会等比缩小
#   - 文件名若未以 cover_ 开头则自动补上前缀(front-matter 里用 cover_xxx.webp 引用)
#   - 转换成功后删除原图及其 :Zone.Identifier 残留(仓库只保留 webp)
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "source" / "images"
MAX_WIDTH = 1600
QUALITY = 82


def convert(src: Path) -> None:
    stem = src.stem
    if not stem.startswith("cover_"):
        stem = "cover_" + stem
    out = src.with_name(stem + ".webp")

    img = Image.open(src).convert("RGB")
    if img.width > MAX_WIDTH:
        h = round(img.height * MAX_WIDTH / img.width)
        img = img.resize((MAX_WIDTH, h), Image.LANCZOS)
    img.save(out, "WEBP", quality=QUALITY, method=6)

    before = src.stat().st_size
    after = out.stat().st_size
    print(f"{before // 1024}KB -> {after // 1024}KB  {src.name} -> {out.name}")

    # 清理原图及 Windows 复制产生的 NTFS 备用数据流残留
    src.unlink()
    zone = src.with_name(src.name + ":Zone.Identifier")
    if zone.exists():
        zone.unlink()


def main() -> None:
    args = sys.argv[1:]
    if args:
        targets = [Path(a) if Path(a).is_absolute() else ROOT / a for a in args]
    else:
        targets = sorted(
            p for p in IMG_DIR.glob("*")
            if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
    if not targets:
        print("没有找到待转换的图片")
        return
    for t in targets:
        convert(t)


if __name__ == "__main__":
    main()
