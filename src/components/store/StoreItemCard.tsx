import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface StoreItem {
  id: string;
  name: string;
  asset_url: string;
  points_cost: number;
}

interface StoreItemCardProps {
  item: StoreItem;
  isOwned: boolean;
  canAfford: boolean;
  onPurchase: (itemId: string) => void;
  isPurchasing: boolean;
}

export const StoreItemCard = ({ item, isOwned, canAfford, onPurchase, isPurchasing }: StoreItemCardProps) => {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        <img src={item.asset_url} alt={item.name} className="h-32 w-32 object-contain" />
      </CardContent>
      <CardFooter>
        {isOwned ? (
          <Badge variant="secondary" className="w-full justify-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Owned
          </Badge>
        ) : (
          <Button
            className="w-full"
            onClick={() => onPurchase(item.id)}
            disabled={!canAfford || isPurchasing}
          >
            {isPurchasing ? 'Purchasing...' : `Buy for ${item.points_cost} pts`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};