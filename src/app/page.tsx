"use client";

import { useEffect, useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { DragEndEvent } from "@dnd-kit/core";

interface Task {
  id: string;
  task: string;
  createDate: string;
  status: string[]; //タスクの状態を管理
  explanation: string;
}

export default function Home() {
  //タスクのリスト
  const [tasks, setTasks] = useState<Task[]>([]);
  //フォームの入力値
  const [newTask, setNewTask] = useState("");
  //編集中のタスクの内容
  const [editTaskList, setEditTaskList] = useState("");
  //編集しているタスクのID
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  //説明文の内容
  const [explainTaskList, setExplainTaskList] = useState("");
  //モーダルの表示を管理
  const [isModalOpen, setIsModalOpen] = useState(false);

  //ドロップ可能なエリア
  const droppableAreas = ["todo", "inProgress", "done"];

  //microCMSからタスクを取得
  useEffect(() => {
    const fetchTasks = async () => {
      const response = await fetch(
        "https://todolistpra.microcms.io/api/v1/todo?fields=id,task,status,explanation,createDate",
        {
          headers: {
            "X-MICROCMS-API-KEY": "jJWbkgVdte2WA425pLSujAWcbpYlYppQZte2",
          },
        }
      );
      const result = await response.json();
      setTasks(result.contents);
    };
    fetchTasks();
  }, []);

  //新しいタスクを追加する関数
  const addTask = async () => {
    if (newTask === "") return; // 空のタスクは送信しない
    await fetch("https://todolistpra.microcms.io/api/v1/todo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": "jJWbkgVdte2WA425pLSujAWcbpYlYppQZte2",
      },
      body: JSON.stringify({
        task: newTask,
        status: ["todo"],
        createDate: new Date().toISOString(),
      }),
    });

    const detailResponse = await fetch(
      "https://todolistpra.microcms.io/api/v1/todo/",
      {
        headers: {
          "X-MICROCMS-API-KEY": "jJWbkgVdte2WA425pLSujAWcbpYlYppQZte2",
        },
      }
    );
    const detail = await detailResponse.json();
    setTasks(detail.contents); // タスク一覧を更新
    setNewTask(""); // 入力欄をクリア
  };

  //タスクを削除
  const deleteTask = async (id: string) => {
    await fetch(`https://todolistpra.microcms.io/api/v1/todo/${id}`, {
      method: "DELETE",
      headers: {
        "X-MICROCMS-API-KEY": "jJWbkgVdte2WA425pLSujAWcbpYlYppQZte2",
      },
    });
    setTasks(tasks.filter((task) => task.id !== id));
  };

  //タスクを編集
  const editTask = async (id: string) => {
    await fetch(`https://todolistpra.microcms.io/api/v1/todo/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": "jJWbkgVdte2WA425pLSujAWcbpYlYppQZte2",
      },
      body: JSON.stringify({
        task: editTaskList, //新しいタスクを送信
        explanation: explainTaskList, // 説明を更新
      }),
    });

    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, task: editTaskList, explanation: explainTaskList }
          : task
      )
    );
    setEditTaskId(null);
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return; // ドロップ先がない場合は何もしない

    const newStatus = over.id as string;

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === active.id ? { ...task, status: [newStatus] } : task
      )
    );

    await fetch(`https://todolistpra.microcms.io/api/v1/todo/${active.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": "jJWbkgVdte2WA425pLSujAWcbpYlYppQZte2",
      },
      body: JSON.stringify({
        status: [newStatus], // ステータスを配列形式で保存
      }),
    });
  };

  // タスクがクリックされたときにモーダルを表示する
  const handleTaskClick = (task: Task) => {
    setEditTaskId(task.id);
    setEditTaskList(task.task);
    setExplainTaskList(task.explanation || "");
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
    setEditTaskId(null);
  };

  // 説明とタスク名の保存
  const saveExplanation = () => {
    if (editTaskId) {
      // サーバーにタスクを更新する
      editTask(editTaskId);
    }
    setIsModalOpen(false); // モーダルを閉じる
  };

  return (
    <div>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="bg-screenBackground min-h-screen flex items-center justify-center">
          {droppableAreas.map((area) => (
            <DroppableArea
              key={area}
              id={area}
              tasks={tasks}
              deleteTask={deleteTask}
              addTask={addTask}
              newTask={newTask}
              setNewTask={setNewTask}
              handleTaskClick={handleTaskClick}
            />
          ))}
        </div>
      </DndContext>
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={saveExplanation}
        editTaskList={editTaskList}
        setEditTaskList={setEditTaskList}
        explainTask={explainTaskList}
        setExplainTask={setExplainTaskList}
      />
    </div>
  );
}

// ドロップエリアのコンポーネント
interface DroppableAreaProps {
  id: string;
  tasks: Task[];
  deleteTask: (id: string) => void;
  addTask: () => void;
  newTask: string;
  setNewTask: (value: string) => void;
  handleTaskClick: (task: Task) => void;
}

function DroppableArea({
  id,
  tasks,
  deleteTask,
  addTask,
  newTask,
  setNewTask,
  handleTaskClick,
}: DroppableAreaProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-200 w-[30%] py-4 px-4 text-center rounded-md"
    >
      <h1 className="my-2 font-semibold">
        {id === "todo" ? "ToDo" : id === "inProgress" ? "作業中" : "完了"}
      </h1>
      <ul>
        {tasks
          .filter(
            (task: any) => Array.isArray(task.status) && task.status[0] === id
          )
          .map((task: any) => (
            <DraggableTask
              key={task.id}
              id={task.id}
              task={task}
              deleteTask={deleteTask}
              handleTaskClick={handleTaskClick}
            />
          ))}
      </ul>

      {/* タスク追加用のinputとbuttonをToDoエリアに表示 */}
      {id === "todo" && (
        <div className="mt-4 flex items-center">
          <input
            type="text"
            value={newTask}
            placeholder="新しいタスクを追加"
            onChange={(e) => setNewTask(e.target.value)}
            className="border-2 border-gray-300 rounded-lg py-2 px-3 shadow-md focus:outline-none focus:border-blue-500 transition-all duration-200 ease-in-out"
          />
          <button
            onClick={addTask}
            className="ml-3 bg-blue-500 text-white border-2 border-blue-500 rounded-lg py-2 px-4 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 ease-in-out"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}

// ドラッグ可能なタスクのコンポーネント
interface DraggableTaskProps {
  id: string;
  task: Task;
  deleteTask: (id: string) => void;
  handleTaskClick: (task: Task) => void;
}

function DraggableTask({ id, task, deleteTask, handleTaskClick }: DraggableTaskProps) {
  const { listeners, setNodeRef, transform } = useDraggable({
    id,
  });
  const draggableStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <li
      style={draggableStyle}
      key={task.id}
      ref={setNodeRef}
      {...listeners}
      className="bg-white my-2 py-3 px-4 border border-gray-300 rounded-md flex justify-between items-center hover:bg-gray-50"
    >
      <div className="flex-1 text-gray-800 font-medium">
        {task.task} - {new Date(task.createDate).toLocaleString()}
      </div>
      <div className="flex">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => handleTaskClick(task)}
          className="text-blue-500 border border-blue-500 rounded-lg py-1 px-2 mx-1 hover:text-blue-600"
        >
          ✏️
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => deleteTask(task.id)}
          className="text-red-500 border border-red-500 rounded-lg py-1 px-2 hover:text-red-600"
        >
          🗑️
        </button>
      </div>
    </li>
  );
}

// モーダルコンポーネント
const Modal = ({
  isOpen,
  onClose,
  onSave,
  editTaskList,
  setEditTaskList,
  explainTask,
  setExplainTask,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editTaskList: string;
  setEditTaskList: (task: string) => void;
  explainTask: string;
  setExplainTask: (description: string) => void;
}) => {
  if (!isOpen) return null;

  const handleOutsideClick = (e: React.MouseEvent) => {
    // モーダルの外側をクリックした場合モーダルを閉じる
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleOutsideClick}
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full"
      >
        <h2 className="text-xl font-bold mb-4">タスクの編集</h2>
        <input
          type="text"
          value={editTaskList}
          onChange={(e) => setEditTaskList(e.target.value)}
          placeholder="タスク名"
          className="w-full border border-gray-300 p-2 mb-4 rounded"
        />
        <textarea
          value={explainTask}
          onChange={(e) => setExplainTask(e.target.value)}
          placeholder="タスクの説明を追加"
          className="w-full border border-gray-300 p-2 mb-4 rounded"
        />
        <button
          onClick={onSave}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          保存
        </button>
        <button
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded mr-2"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
