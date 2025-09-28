import React from 'react';
+import DotGrid from './components/DotGrid';
import './Background.css';

function Background() {
    -    return <div className="background-container" />;
    +    return (
        +      <>
            +        <DotGrid />
            +        <div className="background-container" />
            +      </>
        +    );
}

export default Background;