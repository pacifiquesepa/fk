/**
 * Question Type Editors for Test Builder
 * Provides specific editors for each question type:
 * - Multiple Choice
 * - Fill in Gap
 * - Matching
 * - Drag & Drop
 * - Rearrange
 */

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';

/**
 * MultipleChoiceEditor Component
 * Create/edit multiple choice questions with single correct answer
 */
export function MultipleChoiceEditor({ formData, setFormData, onCancel, onSave, disabled }) {
    const [newOption, setNewOption] = useState('');
    const [error, setError] = useState('');

    const handleAddOption = () => {
        if (!newOption.trim()) {
            setError('Option cannot be empty');
            return;
        }
        if (formData.options.includes(newOption.trim())) {
            setError('This option already exists');
            return;
        }
        setFormData({
            ...formData,
            options: [...formData.options, newOption.trim()]
        });
        setNewOption('');
        setError('');
    };

    const handleRemoveOption = (idx) => {
        const updatedOptions = formData.options.filter((_, i) => i !== idx);
        setFormData({
            ...formData,
            options: updatedOptions,
            answer: formData.answer[0] === formData.options[idx] ? [] : formData.answer
        });
    };

    const handleSave = () => {
        if (!formData.prompt.trim()) {
            setError('Question prompt is required');
            return;
        }
        if (formData.options.length < 2) {
            setError('At least 2 options are required');
            return;
        }
        if (!formData.answer[0]) {
            setError('Please select the correct answer');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={onCancel}
                className="flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-800"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {error && (
                <div className="flex gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Question Prompt */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Question Prompt*</label>
                <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Enter your question here..."
                    maxLength={5000}
                    rows={3}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm resize-none"
                    disabled={disabled}
                />
                <p className="text-xs text-slate-500 mt-1">{formData.prompt.length}/5000</p>
            </div>

            {/* Options */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Options*</label>
                <div className="space-y-2 mb-3">
                    {formData.options.map((option, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <label className="flex-1 flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:border-cyan-400 cursor-pointer">
                                <input
                                    type="radio"
                                    name="correct-answer"
                                    checked={formData.answer[0] === option}
                                    onChange={() => setFormData({ ...formData, answer: [option] })}
                                    className="cursor-pointer"
                                    disabled={disabled}
                                />
                                <span className="text-sm text-slate-900 flex-1">{option}</span>
                            </label>
                            <button
                                onClick={() => handleRemoveOption(idx)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                disabled={disabled}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add New Option */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newOption}
                        onChange={(e) => {
                            setNewOption(e.target.value);
                            setError('');
                        }}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOption();
                            }
                        }}
                        placeholder="Type new option..."
                        maxLength={500}
                        className="flex-1 p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                        disabled={disabled}
                    />
                    <button
                        onClick={handleAddOption}
                        className="px-3 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 disabled:bg-slate-300 font-bold text-sm flex items-center gap-1"
                        disabled={disabled || !newOption.trim()}
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Correct Answer*</label>
                <select
                    value={formData.answer[0] || ''}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value ? [e.target.value] : [] })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                >
                    <option value="">Select the correct option</option>
                    {formData.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
            </div>

            {/* Points */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Points*</label>
                <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    step={0.5}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={disabled || !formData.prompt || formData.options.length < 2 || !formData.answer[0]}
                className="w-full py-3 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:bg-slate-300 font-bold text-sm transition"
            >
                Add Question
            </button>
        </div>
    );
}

/**
 * FillInGapEditor Component
 * Create questions where students type in missing words/phrases
 */
export function FillInGapEditor({ formData, setFormData, onCancel, onSave, disabled }) {
    const [error, setError] = useState('');

    const handleSave = () => {
        if (!formData.prompt.trim()) {
            setError('Question prompt is required');
            return;
        }
        if (!formData.prompt.includes('____')) {
            setError('Question must contain ____ to mark the gap');
            return;
        }
        if (!formData.answer[0] || !formData.answer[0].trim()) {
            setError('Answer is required');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={onCancel}
                className="flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-800"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {error && (
                <div className="flex gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Question Prompt */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                    Question with Gap*
                    <span className="text-slate-500 font-normal"> (use ____ to mark the blank)</span>
                </label>
                <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="The capital of France is ____ and it is known for the Eiffel Tower."
                    maxLength={5000}
                    rows={3}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm resize-none"
                    disabled={disabled}
                />
                <p className="text-xs text-slate-500 mt-1">{formData.prompt.length}/5000</p>
            </div>

            {/* Preview */}
            {formData.prompt.includes('____') && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                    <p className="font-bold text-xs mb-1">Preview:</p>
                    <p>{formData.prompt}</p>
                </div>
            )}

            {/* Answer */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Correct Answer*</label>
                <input
                    type="text"
                    value={formData.answer[0] || ''}
                    onChange={(e) => setFormData({ ...formData, answer: [e.target.value] })}
                    placeholder="Enter the correct word or phrase"
                    maxLength={500}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                />
            </div>

            {/* Points */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Points*</label>
                <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    step={0.5}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={disabled || !formData.prompt || !formData.prompt.includes('____') || !formData.answer[0]}
                className="w-full py-3 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:bg-slate-300 font-bold text-sm transition"
            >
                Add Question
            </button>
        </div>
    );
}

/**
 * MatchingEditor Component
 * Create questions where students match items from two lists
 */
export function MatchingEditor({ formData, setFormData, onCancel, onSave, disabled }) {
    const [newLeft, setNewLeft] = useState('');
    const [newRight, setNewRight] = useState('');
    const [error, setError] = useState('');

    const leftItems = formData.options?.leftItems || (Array.isArray(formData.options) ? formData.options : []);
    const rightItems = formData.options?.rightItems || (formData.answer || []);
    const pairs = Array.isArray(leftItems) && Array.isArray(formData.answer)
        ? leftItems.map((left, idx) => ({ left, right: formData.answer[idx] || '' }))
        : [];

    const handleAddPair = () => {
        if (!newLeft.trim() || !newRight.trim()) {
            setError('Both items required for a match pair');
            return;
        }

        const newAnswers = (formData.answer || []).map(a => a);
        newAnswers.push(newRight.trim());

        setFormData({
            ...formData,
            options: { leftItems: [...leftItems, newLeft.trim()], rightItems: [...rightItems, newRight.trim()] },
            answer: newAnswers
        });

        setNewLeft('');
        setNewRight('');
        setError('');
    };

    const handleRemovePair = (idx) => {
        setFormData({
            ...formData,
            options: { leftItems: leftItems.filter((_, i) => i !== idx), rightItems: rightItems.filter((_, i) => i !== idx) },
            answer: formData.answer.filter((_, i) => i !== idx)
        });
    };

    const handleSave = () => {
        if (!formData.prompt.trim()) {
            setError('Question prompt is required');
            return;
        }
        if (pairs.length < 2) {
            setError('At least 2 matching pairs are required');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={onCancel}
                className="flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-800"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {error && (
                <div className="flex gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Question Prompt */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Question Prompt*</label>
                <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Instruction: Match the items on the left with those on the right"
                    maxLength={5000}
                    rows={2}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm resize-none"
                    disabled={disabled}
                />
            </div>

            {/* Matching Pairs */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Match Pairs*</label>
                <div className="space-y-2 mb-3 bg-slate-50 p-3 rounded-lg">
                    {pairs.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No pairs added yet</p>
                    ) : (
                        pairs.map((pair, idx) => (
                            <div key={idx} className="flex gap-2 items-center text-sm">
                                <div className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded">
                                    {pair.left}
                                </div>
                                <span className="text-slate-400">→</span>
                                <select
                                    value={pair.right}
                                    onChange={(e) => {
                                        const nextAnswers = [...formData.answer];
                                        nextAnswers[idx] = e.target.value;
                                        setFormData({ ...formData, answer: nextAnswers });
                                    }}
                                    className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                                    disabled={disabled}
                                >
                                    <option value="">Select matching answer</option>
                                    {rightItems.filter(Boolean).map((answer) => <option key={answer} value={answer}>{answer}</option>)}
                                    {pair.right && !formData.answer.includes(pair.right) && <option value={pair.right}>{pair.right}</option>}
                                </select>
                                <button
                                    onClick={() => handleRemovePair(idx)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                    disabled={disabled}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Add New Pair */}
                <div className="space-y-2">
                    <input
                        type="text"
                        value={newLeft}
                        onChange={(e) => {
                            setNewLeft(e.target.value);
                            setError('');
                        }}
                        placeholder="Left item (e.g., Capital)"
                        maxLength={200}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                        disabled={disabled}
                    />
                    <input
                        type="text"
                        value={newRight}
                        onChange={(e) => {
                            setNewRight(e.target.value);
                            setError('');
                        }}
                        placeholder="Right item (e.g., Paris)"
                        maxLength={200}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                        disabled={disabled}
                    />
                    <button
                        onClick={handleAddPair}
                        className="w-full px-3 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 disabled:bg-slate-300 font-bold text-sm flex items-center justify-center gap-1"
                        disabled={disabled || !newLeft.trim() || !newRight.trim()}
                    >
                        <Plus size={16} />
                        Add Pair
                    </button>
                </div>
            </div>

            {/* Points */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Points*</label>
                <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    step={0.5}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={disabled || !formData.prompt || pairs.length < 2}
                className="w-full py-3 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:bg-slate-300 font-bold text-sm transition"
            >
                Add Question
            </button>
        </div>
    );
}

/**
 * DragDropEditor Component
 * Create questions where students drag items to correct positions
 */
export function DragDropEditor({ formData, setFormData, onCancel, onSave, disabled }) {
    const [newItem, setNewItem] = useState('');
    const [error, setError] = useState('');

    const items = Array.isArray(formData.options) ? formData.options : [];

    const handleAddItem = () => {
        if (!newItem.trim()) {
            setError('Item cannot be empty');
            return;
        }
        setFormData({
            ...formData,
            options: [...formData.options, newItem.trim()]
        });
        setNewItem('');
        setError('');
    };

    const handleRemoveItem = (idx) => {
        setFormData({
            ...formData,
            options: formData.options.filter((_, i) => i !== idx)
        });
    };

    const handleSave = () => {
        if (!formData.prompt.trim()) {
            setError('Question prompt is required');
            return;
        }
        if (items.length === 0) {
            setError('At least 1 item is required');
            return;
        }
        if (!Array.isArray(formData.answer) || formData.answer.length === 0) {
            setError('Please specify the correct order');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={onCancel}
                className="flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-800"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {error && (
                <div className="flex gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Question Prompt */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Question Prompt*</label>
                <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Instruction: Drag the items to the correct positions"
                    maxLength={5000}
                    rows={2}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm resize-none"
                    disabled={disabled}
                />
            </div>

            {/* Items */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Items to Drag*</label>
                <div className="space-y-2 mb-3">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center p-2 border border-slate-200 rounded-lg bg-slate-50">
                            <GripVertical size={16} className="text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-900 flex-1">{item}</span>
                            <button
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                disabled={disabled}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Item */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => {
                            setNewItem(e.target.value);
                            setError('');
                        }}
                        placeholder="Add item to drag..."
                        maxLength={200}
                        className="flex-1 p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                        disabled={disabled}
                    />
                    <button
                        onClick={handleAddItem}
                        className="px-3 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 disabled:bg-slate-300 font-bold text-sm"
                        disabled={disabled || !newItem.trim()}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <p className="font-bold">ℹ Note:</p>
                <p>Students will drag these items to drop zones. The order they're added here is the correct order.</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Correct Drag Answer*</label>
                <select
                    value={formData.answer[0] || ''}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value ? [e.target.value] : [] })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                >
                    <option value="">Select the correct item</option>
                    {items.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>

            {/* Points */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Points*</label>
                <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    step={0.5}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={disabled || !formData.prompt || items.length === 0}
                className="w-full py-3 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:bg-slate-300 font-bold text-sm transition"
            >
                Add Question
            </button>
        </div>
    );
}

/**
 * RearrangeEditor Component
 * Create questions where students arrange items in correct order
 */
export function RearrangeEditor({ formData, setFormData, onCancel, onSave, disabled }) {
    const [newItem, setNewItem] = useState('');
    const [error, setError] = useState('');

    const items = Array.isArray(formData.options) && formData.options.length ? formData.options : (Array.isArray(formData.answer) ? formData.answer : []);

    const handleAddItem = () => {
        if (!newItem.trim()) {
            setError('Item cannot be empty');
            return;
        }
        setFormData({
            ...formData,
            options: [...items, newItem.trim()],
            answer: [...(formData.answer || []), newItem.trim()]
        });
        setNewItem('');
        setError('');
    };

    const handleRemoveItem = (idx) => {
        setFormData({
            ...formData,
            options: items.filter((_, i) => i !== idx),
            answer: (formData.answer || []).filter((_, i) => i !== idx)
        });
    };

    const handleMoveItem = (idx, direction) => {
        const newAnswer = [...formData.answer];
        if (direction === 'up' && idx > 0) {
            [newAnswer[idx], newAnswer[idx - 1]] = [newAnswer[idx - 1], newAnswer[idx]];
        } else if (direction === 'down' && idx < newAnswer.length - 1) {
            [newAnswer[idx], newAnswer[idx + 1]] = [newAnswer[idx + 1], newAnswer[idx]];
        }
        setFormData({ ...formData, answer: newAnswer });
    };

    const handleSave = () => {
        if (!formData.prompt.trim()) {
            setError('Question prompt is required');
            return;
        }
        if (items.length < 2) {
            setError('At least 2 items are required');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={onCancel}
                className="flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-800"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {error && (
                <div className="flex gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Question Prompt */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Question Prompt*</label>
                <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Instruction: Arrange the items in the correct order"
                    maxLength={5000}
                    rows={2}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm resize-none"
                    disabled={disabled}
                />
            </div>

            {/* Items in Correct Order */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Items in Correct Order*</label>
                <div className="space-y-2 mb-3 bg-slate-50 p-3 rounded-lg">
                    {items.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No items added yet</p>
                    ) : (
                        items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center p-2 bg-white border border-slate-200 rounded-lg">
                                <span className="text-xs font-bold text-slate-600 bg-cyan-100 px-2 py-1 rounded">
                                    {idx + 1}
                                </span>
                                <span className="text-sm text-slate-900 flex-1">{item}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleMoveItem(idx, 'up')}
                                        disabled={idx === 0 || disabled}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => handleMoveItem(idx, 'down')}
                                        disabled={idx === items.length - 1 || disabled}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50"
                                    >
                                        ▼
                                    </button>
                                    <button
                                        onClick={() => handleRemoveItem(idx)}
                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                        disabled={disabled}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <label className="block text-xs font-bold text-slate-600 mb-2">Correct Answer Preview*</label>
                <select
                    value={formData.answer.join(' | ')}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value ? e.target.value.split(' | ') : [] })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                >
                    <option value="">Select the saved order</option>
                    {items.length > 0 && <option value={items.join(' | ')}>{items.join(' → ')}</option>}
                </select>

                {/* Add Item */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => {
                            setNewItem(e.target.value);
                            setError('');
                        }}
                        placeholder="Add item to arrange..."
                        maxLength={200}
                        className="flex-1 p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                        disabled={disabled}
                    />
                    <button
                        onClick={handleAddItem}
                        className="px-3 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 disabled:bg-slate-300 font-bold text-sm"
                        disabled={disabled || !newItem.trim()}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Points */}
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Points*</label>
                <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Math.max(0.5, Number(e.target.value)) })}
                    min={0.5}
                    step={0.5}
                    max={100}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-cyan-600 outline-none text-sm"
                    disabled={disabled}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={disabled || !formData.prompt || items.length < 2}
                className="w-full py-3 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:bg-slate-300 font-bold text-sm transition"
            >
                Add Question
            </button>
        </div>
    );
}
