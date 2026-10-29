import { useState } from "react";
import { Upload } from "lucide-react";
import { Select } from "./ui";
import { validateModel, type Model } from "../storage/models";
export interface ModelSelection {
  models: Model[];
  modelId: string;
  onModelChange: (id: string) => void;
  onImport: (model: Model) => void;
}
export function ModelPicker({
  models,
  modelId,
  onModelChange,
  onImport,
}: ModelSelection) {
  const [error, setError] = useState("");
  return (
    <div className="model-picker">
      <Select
        label="Q-learning 모델"
        value={modelId}
        onChange={onModelChange}
        options={[
          ["current", "기존 Q-table"],
          ...models.map((m) => [m.id, m.name] as [string, string]),
        ]}
      />
      <label className="file-button">
        <Upload size={13} /> 모델 불러오기
        <input
          type="file"
          aria-label="Q-learning 모델 JSON 불러오기"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 20e6)
                throw new Error("20MB 이하 파일을 선택하세요.");
              const model = validateModel(JSON.parse(await file.text()));
              onImport({ ...model, id: crypto.randomUUID() });
              setError("");
            } catch (err) {
              setError(String(err));
            }
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p className="muted" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
