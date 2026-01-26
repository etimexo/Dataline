
import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    isLoading?: boolean;
    variant?: 'primary' | 'secondary';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
    children, 
    isLoading = false, 
    variant = 'primary', 
    className = '', 
    ...props 
}) => {
    const baseClasses = "flex items-center justify-center font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white'
    };

    return (
        <button 
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? <Spinner /> : children}
        </button>
    );
};

export default Button;
