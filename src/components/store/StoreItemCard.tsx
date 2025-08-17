import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

interface StoreItem {
  id: string;
  name: string;
  asset_url: string; // Front-facing image
  asset_url_back?: string | null; // Back hair piece
  point_cost: number;
  category: string; // e.g., 'hair', 'shirt'
}

interface StoreItemCardProps {
  item: StoreItem;
  userPoints: number;
  isOwned: boolean;
  onPurchase: (itemId: string) => void;
  isPurchasing: boolean;
}

export const StoreItemCard = ({ item, userPoints, isOwned, onPurchase, isPurchasing }: StoreItemCardProps) => {
  const canAfford = userPoints >= item.point_cost;
  const isHair = item.category === 'hair';

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{item.name}</CardTitle>
      </CardHeader>
      <CardContent 
        className="flex-grow flex items-center justify-center relative min-h-[150px] bg-contain bg-no-repeat bg-center"
        style={{ backgroundImage: isHair && item.asset_url_back ? `url(${item.asset_url_back})` : 'none' }}
      >
        <img 
          src={item.asset_url} 
          alt={item.name} 
          className={cn("object-contain", isHair ? "h-full w-full" : "max-h-32")}
        />
      </CardContent>
      <CardFooter>
        {isOwned ? (
          <Badge variant="secondary" className="w-full justify-center">Owned ✓</Badge>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={!canAfford || isPurchasing}>
                {item.point_cost} Points
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to spend {item.point_cost} points on the '{item.name}'?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction onClick={() => onPurchase(item.id)}>Yes, Buy It!</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
};