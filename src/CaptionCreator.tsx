import React, { useRef, useState, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Helmet } from "react-helmet";

interface TextObj {
  id: number;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  text: string;
}

interface EditingInput {
  x: number;
  y: number;
}

const TextElement: React.FC<{
  textObj: TextObj;
  selected: boolean;
  onUpdatePosition: (id: number, x: number, y: number) => void;
  onSelect: (id: number) => void;
  onDragEnd: (id: number, finalX: number, finalY: number) => void;
}> = ({ textObj, selected, onUpdatePosition, onSelect, onDragEnd }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ mouseX: 0, mouseY: 0, elemX: textObj.x, elemY: textObj.y });

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(textObj.id);
    startPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: textObj.x,
      elemY: textObj.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startPos.current.mouseX;
      const deltaY = ev.clientY - startPos.current.mouseY;
      onUpdatePosition(textObj.id, startPos.current.elemX + deltaX, startPos.current.elemY + deltaY);
    };

    const handleMouseUp = (_ev: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Gọi callback khi kết thúc kéo thả với vị trí cuối cùng
      onDragEnd(textObj.id, textObj.x, textObj.y);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move select-none whitespace-pre p-1 ${selected ? "border border-blue-500" : ""}`}
      style={{
        left: textObj.x,
        top: textObj.y,
        fontFamily: textObj.fontFamily,
        fontSize: textObj.fontSize,
        color: textObj.fontColor,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(textObj.id);
      }}
    >
      {textObj.text}
    </div>
  );
};

export default function CaptionCreator() {
  const imageLoaderRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLSelectElement>(null);
  const fontSizeRef = useRef<HTMLInputElement>(null);
  const fontColorRef = useRef<HTMLInputElement>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [texts, setTexts] = useState<TextObj[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingInput, setEditingInput] = useState<EditingInput | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Ref để luôn có phiên bản texts mới nhất
  const textsRef = useRef<TextObj[]>(texts);
  useEffect(() => {
    textsRef.current = texts;
  }, [texts]);

  // Undo/Redo sử dụng ref
  const historyStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const saveState = (newTexts: TextObj[]) => {
    historyStack.current.push(JSON.stringify(newTexts));
    if (historyStack.current.length > 50) historyStack.current.shift();
    redoStack.current = [];
  };

  const restoreState = (stateStr: string) => {
    setTexts(JSON.parse(stateStr));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const newImg = new Image();
      newImg.onload = () => {
        setImg(newImg);
        setTexts([]);
        saveState([]);
      };
      newImg.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!canvasRef.current || !img) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = img.width;
    canvasRef.current.height = img.height;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(img, 0, 0);
  }, [img]);

  const handleContainerClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".text-element")) return;
    setSelectedId(null);
    if (editingInput) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setEditingInput({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setInputValue("");
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() !== "") {
        const newText: TextObj = {
          id: Date.now(),
          x: editingInput!.x,
          y: editingInput!.y,
          fontFamily: fontFamilyRef.current?.value || "Arial",
          fontSize: parseInt(fontSizeRef.current?.value || "32"),
          fontColor: fontColorRef.current?.value || "#000000",
          text: inputValue,
        };
        const updated = [...texts, newText];
        setTexts(updated);
        saveState(updated);
      }
      setEditingInput(null);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingInput(null);
    }
  };

  // Cập nhật vị trí text khi kéo thả (không lưu state mỗi lần cập nhật)
  const handleUpdatePosition = (id: number, newX: number, newY: number) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x: newX, y: newY } : t))
    );
  };

  // Hàm xử lý khi kết thúc thao tác kéo thả, lưu lại state hiện tại
  const handleDragEnd = (_id: number, _finalX: number, _finalY: number) => {
    // Lưu lại state cuối cùng của thao tác kéo thả
    saveState(textsRef.current);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedId !== null) {
        const updated = texts.filter((t) => t.id !== selectedId);
        setTexts(updated);
        saveState(updated);
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, texts]);

  const handleUndo = () => {
    if (historyStack.current.length > 1) {
      const last = historyStack.current.pop();
      if (last) {
        redoStack.current.push(last);
        const prevState = historyStack.current[historyStack.current.length - 1];
        restoreState(prevState);
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.current.length) {
      const state = redoStack.current.pop()!;
      historyStack.current.push(state);
      restoreState(state);
    }
  };

  const handleDownload = () => {
    if (!img) return;
    const offScreenCanvas = document.createElement("canvas");
    const offCtx = offScreenCanvas.getContext("2d");
    if (!offCtx) return;
    offScreenCanvas.width = img.width;
    offScreenCanvas.height = img.height;
    offCtx.drawImage(img, 0, 0);
    offCtx.textBaseline = "top";
    texts.forEach((obj) => {
      offCtx.font = `${obj.fontSize}px ${obj.fontFamily}`;
      offCtx.fillStyle = obj.fontColor;
      const lineOffset = obj.fontSize * 0.3;
      const lineHeight = obj.fontSize * 1.5;
      obj.text.split("\n").forEach((line, index) => {
        offCtx.fillText(line, obj.x, obj.y + lineOffset + index * lineHeight);
      });
    });
    const link = document.createElement("a");
    link.download = "image.png";
    link.href = offScreenCanvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen p-6 bg-white text-black dark:bg-gray-900 dark:text-white">
      <Helmet>
        <title>Caption Creator - Tools Hub</title>
        <meta
          name="description"
          content="Caption Creator allows users to add custom text to images with various font options. Drag, edit, and download your annotated images easily."
        />
        <meta
          name="keywords"
          content="Caption Creator, image text editor, meme maker, text on image, font customization, image annotation"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div className="container">
        <h2 className="mb-3 text-2xl font-bold">Caption Creator</h2>
        <div id="hint" className="mb-3 text-sm text-gray-600 italic">
          📌 <b>Instructions:</b> Select an image and click on it to add text.
          Press <b>Enter</b> to save text (it remains draggable).
          Press <b>ESC</b> to cancel text input.
          Click on a text element to select it, then press <b>Delete</b> to remove it.
          Each drag or delete action is recorded for undo/redo.
        </div>
        <div className="mb-3">
          <label htmlFor="imageLoader" className="block font-medium">
            Choose an image (jpg, png, jpeg):
          </label>
          <input
            type="file"
            id="imageLoader"
            accept="image/*"
            className="border p-1"
            ref={imageLoaderRef}
            onChange={handleImageChange}
          />
        </div>
        <div className="flex flex-wrap gap-4 mb-3">
          <div>
            <label htmlFor="fontFamily" className="block font-medium">
              Font family:
            </label>
            <select id="fontFamily" className="border p-1" ref={fontFamilyRef}>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Tahoma">Tahoma</option>
            </select>
          </div>
          <div>
            <label htmlFor="fontSize" className="block font-medium">
              Font size (px):
            </label>
            <input
              type="number"
              id="fontSize"
              className="border p-1 w-20"
              defaultValue={32}
              min={16}
              max={96}
              ref={fontSizeRef}
            />
          </div>
          <div>
            <label htmlFor="fontColor" className="block font-medium">
              Font color:
            </label>
            <input
              type="color"
              id="fontColor"
              className="border p-1"
              defaultValue="#000000"
              ref={fontColorRef}
            />
          </div>
        </div>
        <div className="flex gap-3 mb-3">
          <button onClick={handleUndo} className="btn btn-warning border px-3 py-1">
            Undo
          </button>
          <button onClick={handleRedo} className="btn btn-warning border px-3 py-1">
            Redo
          </button>
          <button onClick={handleDownload} className="btn btn-success border px-3 py-1">
            Download
          </button>
        </div>
        <div
          id="canvasContainer"
          ref={containerRef}
          className="relative inline-block border"
          onClick={handleContainerClick}
          style={{ width: img?.width || 500, height: img?.height || 300 }}
        >
          <canvas id="memeCanvas" ref={canvasRef} />
          {texts.map((obj) => (
            <TextElement
              key={obj.id}
              textObj={obj}
              selected={selectedId === obj.id}
              onUpdatePosition={handleUpdatePosition}
              onSelect={(id) => setSelectedId(id)}
              onDragEnd={handleDragEnd}
            />
          ))}
          {editingInput && (
            <textarea
              className="absolute p-1 border border-gray-300 rounded text-input"
              style={{
                left: editingInput.x,
                top: editingInput.y,
                fontFamily: fontFamilyRef.current?.value || "Arial",
                fontSize: (fontSizeRef.current?.value || "32") + "px",
                color: fontColorRef.current?.value || "#000000",
              }}
              rows={1}
              placeholder="Input text..."
              value={inputValue}
              autoFocus
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
            />
          )}
        </div>
      </div>
    </div>
  );
}
