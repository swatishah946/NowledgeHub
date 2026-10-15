import "./env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { validateQuiz, validateRoadmap } from "../services/aiService.js";

test("quiz: correct answer given as a letter is mapped to the option text", () => {
    const quiz = validateQuiz(
        {
            topic: "JS",
            questions: [
                { question: "2+2?", options: ["3", "4", "5", "6"], correctAnswer: "B", explanation: "math" },
                { question: "Case?", options: ["True", "False"], correctAnswer: "true", explanation: "" },
                { question: "Broken", options: ["x"], correctAnswer: "x" }, // dropped: <2 options
                { question: "Unknown answer", options: ["a", "b"], correctAnswer: "zzz" }, // dropped
            ],
        },
        "JS"
    );
    assert.equal(quiz.questions.length, 2);
    assert.equal(quiz.questions[0].correctAnswer, "4");
    assert.equal(quiz.questions[1].correctAnswer, "True");
});

test("quiz with no usable questions is rejected", () => {
    assert.throws(() => validateQuiz({ questions: [] }, "x"), { code: "QUIZ_INVALID" });
});

test("roadmap keeps at most 4 numbered steps", () => {
    const roadmap = validateRoadmap(
        { goal: "React", estimatedDuration: "4 weeks", steps: Array.from({ length: 6 }, (_, i) => ({ title: `S${i}`, description: "d", duration: "1w", resources: ["r"] })) },
        "React"
    );
    assert.equal(roadmap.steps.length, 4);
    assert.deepEqual(roadmap.steps.map((s) => s.id), [1, 2, 3, 4]);
});
