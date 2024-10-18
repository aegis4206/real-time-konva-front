import { Line, Arrow, Circle, Layer, Rect, Stage, Text, Transformer, Image } from 'react-konva'
import './App.css'
import { useEffect, useRef, useState } from 'react'
import { GiArrowCursor } from 'react-icons/gi';
import { TbRectangle } from 'react-icons/tb';
import { FaRegCircle } from 'react-icons/fa6';
import { FaLongArrowAltRight } from 'react-icons/fa';
import { LuPencil } from 'react-icons/lu';
import { IoMdDownload } from 'react-icons/io';
import { PiTextTBold } from "react-icons/pi";
import { FaRegImage } from "react-icons/fa6";
import { MdOutlineDeleteForever } from "react-icons/md";
import { ImFileEmpty } from "react-icons/im";
import { BiFont } from "react-icons/bi";
import Konva from 'konva';
import { v4 as uuid } from 'uuid';
import { RiPencilFill } from 'react-icons/ri';

const Actions = {
  SELECT: "SELECT",
  RECTANGLE: "RECTANGLE",
  CIRCLE: "CIRCLE",
  LINE: "LINE",
  ARROW: "ARROW",
  TEXT: "TEXT"
}

type shapeCategory = typeof Rect | typeof Circle | typeof Arrow | typeof Line | typeof Text | typeof Image

interface shapeType {
  id: string,
  shape: shapeCategory | null,
  fillColor: string,
  strokeColor: string,
  x?: number,
  y?: number,
  height?: number,
  width?: number,
  radius?: number,
  points?: number[],
  scaleX?: number,
  scaleY?: number,
  text?: string,
  image?: string,
}


function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [action, setAction] = useState(Actions.SELECT)
  const [fillColor, setFillColor] = useState("#ff0000")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [shapes, setShapes] = useState<shapeType[]>([])

  const ws = useRef<WebSocket | null>(null)
  const [isUpdate, setIsUpdate] = useState(false)

  // const [text, setText] = useState("")
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const isPaining = useRef<boolean>(false);
  const currentShapeId = useRef<string>("");
  const isDraggable = action === Actions.SELECT;

  useEffect(() => {
    if (!ws.current) {
      ws.current = new WebSocket("ws://192.168.6.87:8888")

      ws.current.onopen = () => {
        console.log("WebSocket connected.");
      }

      ws.current.onmessage = async (event: MessageEvent) => {
        const message: shapeType[] = JSON.parse(event.data)
        console.log(message);
        if (message) {
          setShapes(message)
        }
      }

      ws.current.onclose = () => {
        // ws.current = undefined;
      }
    }
    return () => {
      if (ws.current && ws.current.readyState == 1) {
        ws.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (isUpdate && ws.current && ws.current.readyState == 1) {
      ws.current.send(JSON.stringify(shapes))
      setIsUpdate(false);
    }
  }, [isUpdate])

  // const handleWsSend = (newShapes?: shapeType[]) => {
  //   // const sendState = action != Actions.SELECT && action != Actions.TEXT
  //   if (ws.current && ws.current.readyState == 1) {
  //     ws.current.send(JSON.stringify(newShapes ?? shapes))
  //     setIsUpdate(false);
  //   }
  // }


  const onPointerDown = () => {
    // console.log("Down");
    if (action === Actions.SELECT) return;

    if (action === Actions.TEXT && textAreaRef.current) return;


    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const { x, y } = pos;
    const id = uuid();

    currentShapeId.current = id;
    isPaining.current = true;

    const shapeDetail: shapeType = {
      id,
      shape: null,
      fillColor,
      strokeColor,
      height: 0,
      width: 0
    }



    switch (action) {
      case Actions.RECTANGLE:
        shapeDetail.shape = Rect;
        shapeDetail.x = x;
        shapeDetail.y = y;
        break;
      case Actions.CIRCLE:
        shapeDetail.shape = Circle;
        shapeDetail.x = x;
        shapeDetail.y = y;
        shapeDetail.radius = 0;
        break;
      case Actions.ARROW:
        shapeDetail.shape = Arrow;
        shapeDetail.points = [x, y, x, y];
        break;
      case Actions.LINE:
        shapeDetail.shape = Line;
        shapeDetail.points = [x, y];
        break;
      case Actions.TEXT:

        shapeDetail.shape = Text;
        shapeDetail.x = x;
        shapeDetail.y = y;
        shapeDetail.width = 100;
        shapeDetail.text = "";

        handleTextAreaCreate(x, y, id);

        break;
    }
    setShapes((preShapes) => {

      return [
        ...preShapes,
        {
          ...shapeDetail
        }
      ]
    })


  }
  const onPointerMove = () => {
    if (action === Actions.SELECT || !isPaining.current) return;
    // console.log("Move");

    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    let detail = {};



    setShapes(
      (preShapes) =>
        preShapes.map((shape) => {
          if (shape.id !== currentShapeId.current) return shape;

          switch (action) {
            case Actions.RECTANGLE:
              detail = {
                height: pos.y - shape.y!,
                width: pos.x - shape.x!,
              }
              break;
            case Actions.CIRCLE:
              detail = {
                radius: Math.round(((pos.y - shape.y!) ** 2 + (pos.x - shape.x!) ** 2) ** 0.5),
              }
              break;
            case Actions.ARROW:
              if (shape.points) {
                detail = {
                  points: [shape.points[0], shape.points[1], pos.x, pos.y]
                }
              }
              break;
            case Actions.LINE:
              if (shape.points) {
                detail = {
                  points: [...shape.points, pos.x, pos.y]
                }
              }
              break;
            case Actions.TEXT:
              detail = {
                width: pos.x - shape.x!,
              };

              if (textAreaRef.current) {
                textAreaRef.current.style.width = `${pos.x - shape.x!}px`;
                textAreaRef.current.style.height = `${pos.y - shape.y!}px`;
                textAreaRef.current.focus();
              }

              break;
          }
          return {
            ...shape,
            ...detail
          }
        })
    )
  }
  const onPointerUp = () => {
    // console.log("Up");
    isPaining.current = false;
    // handleWsSend();
    if (action !== Actions.SELECT) {
      setIsUpdate(true);
    }
  }

  const handleExport = () => {
    if (stageRef.current) {
      const url = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = "image.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const handleShapeClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (action !== Actions.SELECT) return;
    // console.log(event);
    const target = event.currentTarget;
    transformerRef.current?.nodes([target])
  }

  const handleShapeChange = (type: string) => {
    return (event: Konva.KonvaEventObject<Event>) => {
      const transformId = event.target.attrs.id;
      const transformNode = event.target;

      setShapes(
        (preShapes) => {
          const newShapes = preShapes.map((shape) => {
            if (shape.id !== transformId) return shape;
            return type === "transform" ? {
              ...shape,
              x: transformNode.x(),
              y: transformNode.y(),
              scaleY: transformNode.scaleY(),
              scaleX: transformNode.scaleX(),
            } : {
              ...shape,
              x: transformNode.x(),
              y: transformNode.y(),
            }
          })
          return newShapes
        }
      )
      setIsUpdate(true);
    }
  };

  const onTransformEnd = handleShapeChange("transform")
  const onDragEnd = handleShapeChange("drag")

  const handleActionChange = (action: string) => {
    setAction(action)
    transformerRef.current?.nodes([]);
  };

  const handleClear = () => {
    transformerRef.current?.nodes([]);
    setShapes([]);
    setIsUpdate(true);
  };

  const handleTextEdit = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const textArea = document.createElement('textarea');
    document.body.appendChild(textArea);
    const editId = event.target.attrs.id;
    const filterShape = shapes.filter(shape => shape.id === editId)
    if (filterShape.length === 0) return;
    const target = filterShape[0]
    const style = textArea.style;

    textArea.value = target.text!;
    style.position = 'absolute';
    style.top = `${target.y}px`;
    style.left = `${target.x}px`;
    style.width = `${event.target.getClientRect().width + 10}px`;
    style.height = `${event.target.getClientRect().height + 10}px`;
    style.fontSize = `18px`;
    style.border = '1px dashed black';
    style.outline = 'none';
    style.resize = 'none';
    style.overflowY = 'clip';
    style.color = target.fillColor;
    textArea.focus();

    // textarea.addEventListener('keydown', (e) => {
    //   if (e.key === 'Enter') {
    //     setText(e.target.value);
    //     document.body.removeChild(textarea);
    //   }
    // });

    const handleTextAreaClear = () => {
      try {
        if (document.body.contains(textArea)) {
          document.body.removeChild(textArea);
        }
      } catch {
        void 0;
      }
      textArea.removeEventListener('keydown', handleKeyDown);
    }
    const handleBlur = () => {
      handleTextAreaClear();
      textArea.removeEventListener('blur', handleBlur)

    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key as 'Enter' | 'Escape';

      if (key === 'Enter') {
        console.log("enter");
        const target = event.target as HTMLTextAreaElement;
        setShapes(
          (preShapes) => {
            const newShapes = preShapes.map((shape) => {
              if (shape.id !== editId) return shape;
              return {
                ...shape,
                text: (target.value).toString()
              }
            })
            // handleWsSend(newShapes);
            return newShapes;
          }

        )
        setIsUpdate(true);

        handleTextAreaClear();
      } else if (key === 'Escape') {
        handleTextAreaClear();
      }
    };
    textArea.addEventListener('keydown', handleKeyDown);
    textArea.addEventListener('blur', handleBlur)
  };

  const handleTextAreaCreate = (x: number, y: number, id: string) => {
    const textArea = document.createElement('textarea');
    textAreaRef.current = textArea

    textArea.value = "";
    const style = textArea.style
    style.position = 'absolute';
    style.top = `${y}px`;
    style.left = `${x}px`;
    style.width = `0px`;
    style.height = `0px`;
    style.fontSize = `18px`;
    style.border = '1px dashed black';
    style.outline = 'none';
    style.resize = 'none';
    style.overflowY = 'clip';
    style.color = fillColor;
    document.body.appendChild(textArea);
    // textArea.focus();


    const handleEnterPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        console.log("enter");

        const target = event.target as HTMLTextAreaElement;
        setShapes(
          (preShapes) => {
            const newShapes = preShapes.map((shape) => {
              if (shape.id !== id) return shape;
              return {
                ...shape,
                text: (target.value).toString()
              }
            })
            // handleWsSend(newShapes);
            return newShapes;
          }

        )
        setIsUpdate(true);
        handleTextAreaClear();
      }
    };

    const handleEscapePress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleTextAreaClear();
      }
    };

    const handleBlur = () => {
      handleTextAreaClear();
    };

    const handleTextAreaClear = () => {
      try {
        if (document.body.contains(textArea)) {
          document.body.removeChild(textArea);
        }
      } catch {
        void 0;
      }

      textAreaRef.current = null;
      isPaining.current = false;
      handleTrim();

      textArea.removeEventListener('keydown', handleEnterPress);
      textArea.removeEventListener('keydown', handleEscapePress);
      textArea.removeEventListener('blur', handleBlur);
      textArea.removeEventListener('mouseup', handleMouseUp);
    };

    textArea.addEventListener('keydown', handleEnterPress);
    textArea.addEventListener('keydown', handleEscapePress);
    textArea.addEventListener('blur', handleBlur);

    const handleMouseUp = () => {
      textArea.focus();
      isPaining.current = false;
    }

    const handleTrim = () => {
      setShapes((preShapes) => preShapes.filter(shape => {
        if (shape.shape === Text) {
          return shape.text !== ""
        }
        return true
      }
      ))
    }

    textArea.addEventListener('mouseup', handleMouseUp);
  };

  const handleDelete = () => {
    if (transformerRef.current?.nodes().length == 0 || action !== Actions.SELECT) return;
    const deleteId = transformerRef.current!.nodes()[0].id()

    setShapes((preShapes) => preShapes.filter(shape =>
      shape.id !== deleteId
    ))

    transformerRef.current!.nodes([]);
    setIsUpdate(true);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // const img = new window.Image();
      // img.src = reader.result as string;
      // setImage(img);
      const base64Data = reader.result as string
      const id = uuid();
      const imgDetail: shapeType = {
        id,
        shape: Image,
        fillColor,
        strokeColor,
        height: 100,
        width: 100,
        image: base64Data,
        x: 100,
        y: 100
      }

      setShapes((preShapes) => {

        return [
          ...preShapes,
          {
            ...imgDetail
          }
        ]
      })

      setIsUpdate(true);
    };
    reader.readAsDataURL(file);


  };



  const handleWindowsKeyDown = (event: KeyboardEvent) => {
    if (action !== Actions.SELECT) return;
    if (event.key === 'Delete') {
      handleDelete();
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleWindowsKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowsKeyDown);
    };
  }, []);

  const handleElementSelectByIdClick = (id: string) => {
    return () => {
      const element = document.getElementById(id);
      element?.click();
    }
  }

  const handleFillColorClick = handleElementSelectByIdClick('fillColorInput');
  const handleImageClick = handleElementSelectByIdClick('fileInput');
  const handleStrokeColorClick = handleElementSelectByIdClick('strockColorInput');

  return (
    <>
      <div className="relative w-full h-screen overflow-hidden">
        <div className="absolute top-0 z-10 w-full py-2">
          <div className="flex justify-center items-center gap-3 py-2 px-3 w-fit mx-auto border shadow-lg rounded-lg">
            <button
              className={
                action === Actions.SELECT
                  ? "bg-violet-300 p-1 rounded"
                  : "p-1 hover:bg-violet-100 rounded"
              }
              onClick={() => handleActionChange(Actions.SELECT)}
            >
              <GiArrowCursor size={"2rem"} />
            </button>
            <button
              className={
                action === Actions.RECTANGLE
                  ? "bg-violet-300 p-1 rounded"
                  : "p-1 hover:bg-violet-100 rounded"
              }
              onClick={() => handleActionChange(Actions.RECTANGLE)}
            >
              <TbRectangle size={"2rem"} />
            </button>
            <button
              className={
                action === Actions.CIRCLE
                  ? "bg-violet-300 p-1 rounded"
                  : "p-1 hover:bg-violet-100 rounded"
              }
              onClick={() => handleActionChange(Actions.CIRCLE)}
            >
              <FaRegCircle size={"2rem"} />
            </button>
            <button
              className={
                action === Actions.ARROW
                  ? "bg-violet-300 p-1 rounded"
                  : "p-1 hover:bg-violet-100 rounded"
              }
              onClick={() => handleActionChange(Actions.ARROW)}
            >
              <FaLongArrowAltRight size={"2rem"} />
            </button>
            <button
              className={
                action === Actions.LINE
                  ? "bg-violet-300 p-1 rounded"
                  : "p-1 hover:bg-violet-100 rounded"
              }
              onClick={() => handleActionChange(Actions.LINE)}
            >
              <LuPencil size={"2rem"} />
            </button>
            <button
              className={
                action === Actions.TEXT
                  ? "bg-violet-300 p-1 rounded"
                  : "p-1 hover:bg-violet-100 rounded"
              }
              onClick={() => handleActionChange(Actions.TEXT)}
            >
              <PiTextTBold size={"2rem"} />
            </button>

            <div className='flex flex-col'>
              <BiFont
                color={fillColor} size={"2rem"}
                onClick={handleFillColorClick}
                className='cursor-pointer'
              />
              <input
                id="fillColorInput"
                className="size-8 h-4 -mt-1.5 cursor-pointer border-none bg-transparent"
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
              />
            </div>
            <div className='flex flex-col'>
              <RiPencilFill
                color={strokeColor} size={"2rem"}
                onClick={handleStrokeColorClick}
                className='cursor-pointer'
              />
              <input
                id="strockColorInput"
                className="size-8 h-4 -mt-1.5 cursor-pointer border-none bg-transparent"
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
              />
            </div>
            <button onClick={handleExport}>
              <IoMdDownload size={"2rem"} />
            </button>
            <input id="fileInput" type="file" accept="image/*" onChange={handleFileUpload} className='hidden' />
            <FaRegImage className='cursor-pointer' onClick={handleImageClick} size={"2rem"} />
            <button onClick={handleDelete}>
              <MdOutlineDeleteForever size={"2rem"} />
            </button>
            <button onClick={() => handleClear()}>
              <ImFileEmpty size={"2rem"} />
            </button>
          </div>
        </div>
        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              height={window.innerHeight}
              width={window.innerWidth}
              fill="#ffffff"
              id="bg"
              onClick={() => {
                transformerRef.current?.nodes([]);
              }}
            />
            {shapes.map(shape => {
              if (!shape.shape) return <></>;

              if (shape.shape === Image) {
                const img = new window.Image();
                img.src = shape.image ?? "";
                return <Image
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  image={img}
                  height={shape.height}
                  width={shape.width}
                  draggable={isDraggable}
                  onClick={handleShapeClick}
                  onTransformEnd={onTransformEnd}
                  onDragEnd={onDragEnd}
                  scaleX={shape.scaleX}
                  scaleY={shape.scaleY}
                >
                </Image>
              }
              if (shape.shape !== Text) {
                return <shape.shape
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  height={shape.height ?? 0}
                  width={shape.width ?? 0}
                  stroke={(shape.shape == Line) ? shape.fillColor : shape.strokeColor}
                  strokeWidth={2}
                  fill={shape.fillColor}
                  points={shape.points ? shape.points : []}
                  radius={shape.radius ?? 0}
                  draggable={isDraggable}
                  onClick={handleShapeClick}
                  onTransformEnd={onTransformEnd}
                  scaleX={shape.scaleX}
                  scaleY={shape.scaleY}
                  onDragEnd={onDragEnd}
                  image={undefined}
                ></shape.shape>
              }

              return <Text
                key={shape.id}
                id={shape.id}
                text={shape.text}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                fontSize={18}
                draggable={isDraggable}
                onClick={handleShapeClick}
                onTransformEnd={onTransformEnd}
                scaleX={shape.scaleX}
                scaleY={shape.scaleY}
                onDragEnd={onDragEnd}
                stroke={shape.fillColor}
                strokeWidth={0}
                fill={shape.fillColor}
                onDblClick={handleTextEdit}
              />
            })}

            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div >
    </>
  )
}

export default App
