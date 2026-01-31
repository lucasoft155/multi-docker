import React from 'react';
import { Link } from 'react-router-dom';

export default () => {
    return (
        <div>
            In other page
            <Link to="/">Go back home</Link>
        </div>
    );
};