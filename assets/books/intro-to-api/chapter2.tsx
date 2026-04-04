import React from 'react';

// Using a named export inside the component or default export? We'll rely on the filename / meta for title in TSX, since it doesn't have frontmatter.

export default function AdvancedUsage() {
  return (
    <div>
      <h1>Advanced Usage</h1>
      <p>This chapter is rendered from a raw TSX file! You can use standard React components here.</p>
    </div>
  );
}
