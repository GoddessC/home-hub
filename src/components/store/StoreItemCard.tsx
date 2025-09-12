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

interface StoreItem {
  id: string;
  name: string;
  image_url: string;
  back_image_url?: string | null;
  category: string;
  point_cost: number;
}

interface StoreItemCardProps {
  item: StoreItem;
  userPoints: number;
  isOwned: boolean;
  onPurchase: (itemId: string) => void;
  isPurchasing: boolean;
  currentHeadUrl?: string | null;
}

export const StoreItemCard = ({ item, userPoints, isOwned, onPurchase, isPurchasing, currentHeadUrl }: StoreItemCardProps) => {
  const canAfford = userPoints >= item.point_cost;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        {item.category === 'hair' ? (
          <div className="relative w-full h-32 flex items-center justify-center">
            {/* Back Hair Layer */}
            {item.back_image_url && (
              <img 
                src={item.back_image_url} 
                alt={`${item.name} Back`} 
                className="absolute max-h-32 object-contain" 
                style={{ zIndex: 1 }}
              />
            )}
            {/* Head Layer */}
            {currentHeadUrl && (
              <img 
                src={currentHeadUrl} 
                alt="Avatar Head" 
                className="absolute max-h-32 object-contain" 
                style={{ zIndex: 2 }}
              />
            )}
            {/* Front Hair Layer */}
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="relative max-h-32 object-contain" 
              style={{ zIndex: 3 }}
            />
          </div>
        ) : (
          <img src={item.image_url} alt={item.name} className="max-h-32 object-contain" />
        )}
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