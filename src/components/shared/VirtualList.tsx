// Virtual List Component using react-window
// For lists >100 items to prevent rendering lag

import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

export function VirtualList<T>({ 
  items, 
  height, 
  itemHeight, 
  renderItem,
  className = ''
}: VirtualListProps<T>) {
  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      className={className}
    >
      {Row}
    </FixedSizeList>
  );
}

