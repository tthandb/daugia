import { FC } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    ["link", "image"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
];

interface OnChangeHandler {
  (e: any): void;
}

type Props = {
  value?: string;
  placeholder?: string;
  onChange?: OnChangeHandler;
};

const TextEditor: FC<Props> = ({ value, onChange, placeholder }) => {
  return (
    <ReactQuill
      theme="snow"
      modules={modules}
      formats={formats}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

export default TextEditor;