import { useState } from 'react';
import { X, Delete } from 'lucide-react';

interface CalculatorProps {
    onClose: () => void;
}

export const Calculator = ({ onClose }: CalculatorProps) => {
    const [display, setDisplay] = useState('0');
    const [previousValue, setPreviousValue] = useState<number | null>(null);
    const [operation, setOperation] = useState<string | null>(null);
    const [newNumber, setNewNumber] = useState(true);

    const handleNumber = (num: string) => {
        if (newNumber) {
            setDisplay(num);
            setNewNumber(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const handleDecimal = () => {
        if (newNumber) {
            setDisplay('0.');
            setNewNumber(false);
        } else if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const handleOperation = (op: string) => {
        const current = parseFloat(display);

        if (previousValue !== null && operation && !newNumber) {
            const result = calculate(previousValue, current, operation);
            setDisplay(String(result));
            setPreviousValue(result);
        } else {
            setPreviousValue(current);
        }

        setOperation(op);
        setNewNumber(true);
    };

    const calculate = (prev: number, current: number, op: string): number => {
        switch (op) {
            case '+': return prev + current;
            case '-': return prev - current;
            case '×': return prev * current;
            case '÷': return current !== 0 ? prev / current : 0;
            case '^': return Math.pow(prev, current);
            default: return current;
        }
    };

    const handleEquals = () => {
        if (previousValue !== null && operation) {
            const current = parseFloat(display);
            const result = calculate(previousValue, current, operation);
            setDisplay(String(result));
            setPreviousValue(null);
            setOperation(null);
            setNewNumber(true);
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setPreviousValue(null);
        setOperation(null);
        setNewNumber(true);
    };

    const handleFunction = (func: string) => {
        const current = parseFloat(display);
        let result = 0;

        switch (func) {
            case 'sin': result = Math.sin(current); break;
            case 'cos': result = Math.cos(current); break;
            case 'tan': result = Math.tan(current); break;
            case 'sqrt': result = Math.sqrt(current); break;
            case 'log': result = Math.log10(current); break;
            case 'ln': result = Math.log(current); break;
            case '1/x': result = 1 / current; break;
            case 'x²': result = current * current; break;
        }

        setDisplay(String(result));
        setNewNumber(true);
    };

    const Button = ({ children, onClick, className = '', span = false }: any) => (
        <button
            onClick={onClick}
            className={`p-3 rounded-lg font-semibold text-sm transition-colors ${className} ${span ? 'col-span-2' : ''}`}
        >
            {children}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calculator</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-4">
                        <div className="text-right text-3xl font-mono text-gray-900 dark:text-white break-all">
                            {display}
                        </div>
                        {operation && (
                            <div className="text-right text-sm text-gray-500 mt-1">
                                {previousValue} {operation}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <Button onClick={() => handleFunction('sin')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">sin</Button>
                        <Button onClick={() => handleFunction('cos')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">cos</Button>
                        <Button onClick={() => handleFunction('tan')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">tan</Button>
                        <Button onClick={() => handleOperation('^')} className="bg-orange-500 hover:bg-orange-600 text-white">x^y</Button>

                        <Button onClick={() => handleFunction('sqrt')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">√</Button>
                        <Button onClick={() => handleFunction('x²')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">x²</Button>
                        <Button onClick={() => handleFunction('1/x')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">1/x</Button>
                        <Button onClick={() => handleOperation('÷')} className="bg-orange-500 hover:bg-orange-600 text-white">÷</Button>

                        <Button onClick={() => handleNumber('7')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">7</Button>
                        <Button onClick={() => handleNumber('8')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">8</Button>
                        <Button onClick={() => handleNumber('9')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">9</Button>
                        <Button onClick={() => handleOperation('×')} className="bg-orange-500 hover:bg-orange-600 text-white">×</Button>

                        <Button onClick={() => handleNumber('4')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">4</Button>
                        <Button onClick={() => handleNumber('5')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">5</Button>
                        <Button onClick={() => handleNumber('6')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">6</Button>
                        <Button onClick={() => handleOperation('-')} className="bg-orange-500 hover:bg-orange-600 text-white">-</Button>

                        <Button onClick={() => handleNumber('1')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">1</Button>
                        <Button onClick={() => handleNumber('2')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">2</Button>
                        <Button onClick={() => handleNumber('3')} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">3</Button>
                        <Button onClick={() => handleOperation('+')} className="bg-orange-500 hover:bg-orange-600 text-white">+</Button>

                        <Button onClick={() => handleNumber('0')} span className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">0</Button>
                        <Button onClick={handleDecimal} className="bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500">.</Button>
                        <Button onClick={handleEquals} className="bg-green-500 hover:bg-green-600 text-white">=</Button>

                        <Button onClick={handleClear} span className="bg-red-500 hover:bg-red-600 text-white">
                            <div className="flex items-center justify-center">
                                <Delete className="h-4 w-4 mr-1" />
                                Clear
                            </div>
                        </Button>
                        <Button onClick={() => handleFunction('log')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">log</Button>
                        <Button onClick={() => handleFunction('ln')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">ln</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
