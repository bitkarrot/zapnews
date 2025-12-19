import { useState, useEffect, useRef, forwardRef } from 'react';
import { Zap, Copy, Check, ExternalLink, Sparkle, Sparkles, Star, Rocket, ArrowLeft, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useIsMobile } from '@/hooks/useIsMobile';

import type { Event } from 'nostr-tools';
import QRCode from 'qrcode';

interface ZapDialogProps {
  target: Event;
  children?: React.ReactNode;
  className?: string;
}

const presetAmounts = [
  { amount: 21, icon: Sparkle },
  { amount: 100, icon: Sparkles },
  { amount: 500, icon: Zap },
  { amount: 1000, icon: Star },
  { amount: 5000, icon: Rocket },
];

interface ZapContentProps {
  invoice: string | null;
  amount: number | string;
  comment: string;
  isZapping: boolean;
  isPaying: boolean;
  qrCodeUrl: string;
  copied: boolean;
  hasWallet: boolean;
  handleZap: () => void;
  handlePayWithWallet: () => void;
  handleCopy: () => void;
  openInWallet: () => void;
  setAmount: (amount: number | string) => void;
  setComment: (comment: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

// Moved ZapContent outside of ZapDialog to prevent re-renders causing focus loss
const ZapContent = forwardRef<HTMLDivElement, ZapContentProps>(({
  invoice,
  amount,
  comment,
  isZapping,
  isPaying,
  qrCodeUrl,
  copied,
  hasWallet,
  handleZap,
  handlePayWithWallet,
  handleCopy,
  openInWallet,
  setAmount,
  setComment,
  inputRef,
}, ref) => (
  <div ref={ref}>
    {invoice ? (
      <div className="flex flex-col h-full min-h-0">
        {/* Payment amount display */}
        <div className="text-center pt-2">
          <div className="text-2xl font-bold text-amber-500">{amount} sats</div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col justify-center min-h-0 flex-1 px-2">
          {/* Primary payment button - only show if wallet connected */}
          {hasWallet && (
            <>
              <Button
                onClick={handlePayWithWallet}
                disabled={isPaying}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white mb-4"
                size="lg"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Paying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Pay with Wallet
                  </>
                )}
              </Button>
              <div className="flex items-center gap-2 my-2">
                <div className="h-px flex-1 bg-muted" />
                <span className="text-xs text-muted-foreground">OR SCAN QR</span>
                <div className="h-px flex-1 bg-muted" />
              </div>
            </>
          )}

          {/* QR Code */}
          <div className="flex justify-center">
            <Card className="p-2 max-w-[180px] mx-auto bg-white">
              <CardContent className="p-0 flex justify-center">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Lightning Invoice QR Code"
                    className="w-full h-auto aspect-square max-w-full object-contain rounded"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted animate-pulse rounded" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice copy */}
          <div className="flex gap-2 mt-4">
            <Input
              value={invoice}
              readOnly
              className="font-mono text-[10px] min-w-0 flex-1 overflow-hidden text-ellipsis h-8"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 h-8 px-2"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Open in wallet button */}
          <Button
            variant="ghost"
            onClick={openInWallet}
            className="w-full mt-2 text-xs"
            size="sm"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open in Wallet App
          </Button>
        </div>
      </div>
    ) : (
      <>
        <div className="grid gap-3 px-4 py-4 w-full overflow-hidden">
          <ToggleGroup
            type="single"
            value={String(amount)}
            onValueChange={(value) => {
              if (value) {
                setAmount(parseInt(value, 10));
              }
            }}
            className="grid grid-cols-5 gap-1 w-full"
          >
            {presetAmounts.map(({ amount: presetAmount, icon: Icon }) => (
              <ToggleGroupItem
                key={presetAmount}
                value={String(presetAmount)}
                className="flex flex-col h-auto min-w-0 text-xs px-1 py-2"
              >
                <Icon className="h-4 w-4 mb-1" />
                <span className="truncate">{presetAmount}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-muted" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-muted" />
          </div>
          <Input
            ref={inputRef}
            id="custom-amount"
            type="number"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-sm"
          />
          <Textarea
            id="custom-comment"
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full resize-none text-sm"
            rows={2}
          />
        </div>
        <div className="px-4 pb-4">
          <Button
            onClick={handleZap}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            disabled={isZapping}
            size="default"
          >
            {isZapping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating invoice...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Zap {amount} sats
              </>
            )}
          </Button>
        </div>
      </>
    )}
  </div>
));
ZapContent.displayName = 'ZapContent';

export function ZapDialog({ target, children, className }: ZapDialogProps) {
  const [open, setOpen] = useState(false);

  const [isPaying, setIsPaying] = useState(false);
  const { user } = useCurrentUser();
  const { data: author } = useAuthor(target.pubkey);
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();
  const { zap, isZapping, invoice, setInvoice } = useZaps(target, webln, activeNWC, () => {
    toast({
      title: 'Zap sent! ⚡',
      description: `Successfully zapped ${amount} sats`,
    });
    setOpen(false);
  });
  const [amount, setAmount] = useState<number | string>(100);
  const [comment, setComment] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const hasWallet = !!(webln || activeNWC);

  useEffect(() => {
    if (target) {
      setComment('Zapped with Zap News! ⚡');
    }
  }, [target]);

  // Generate QR code
  useEffect(() => {
    let isCancelled = false;

    const generateQR = async () => {
      if (!invoice) {
        setQrCodeUrl('');
        return;
      }

      try {
        const url = await QRCode.toDataURL(invoice.toUpperCase(), {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        if (!isCancelled) {
          setQrCodeUrl(url);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to generate QR code:', err);
        }
      }
    };

    generateQR();

    return () => {
      isCancelled = true;
    };
  }, [invoice]);

  const handleCopy = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Lightning invoice copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInWallet = () => {
    if (invoice) {
      const lightningUrl = `lightning:${invoice}`;
      window.open(lightningUrl, '_blank');
    }
  };

  const handlePayWithWallet = async () => {
    if (!invoice) return;

    setIsPaying(true);
    try {
      if (webln) {
        // Try WebLN first
        try {
          if (webln.enable) {
            await webln.enable();
          }
          await webln.sendPayment(invoice);
          toast({
            title: 'Zap sent! ⚡',
            description: `Successfully zapped ${amount} sats`,
          });
          setOpen(false);
          return;
        } catch (e) {
          console.log('WebLN payment failed, trying NWC...', e);
        }
      }

      // Fall back to zap function which handles NWC
      const finalAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;
      zap(finalAmount, comment);
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (open) {
      setAmount(100);
      setInvoice(null);
      setCopied(false);
      setQrCodeUrl('');
      setIsPaying(false);
    } else {
      setAmount(100);
      setInvoice(null);
      setCopied(false);
      setQrCodeUrl('');
      setIsPaying(false);
    }
  }, [open, setInvoice]);

  const handleZap = () => {
    const finalAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;
    zap(finalAmount, comment);
  };



  const contentProps = {
    invoice,
    amount,
    comment,
    isZapping,
    isPaying,
    qrCodeUrl,
    copied,
    hasWallet,
    handleZap,
    handlePayWithWallet,
    handleCopy,
    openInWallet,
    setAmount,
    setComment,
    inputRef,

  };

  if (!user || user.pubkey === target.pubkey || (!author?.metadata?.lud06 && !author?.metadata?.lud16)) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <Drawer
          open={open}
          onOpenChange={(newOpen) => {
            if (!newOpen) {
              setInvoice(null);
              setQrCodeUrl('');
            }
            setOpen(newOpen);
          }}
          dismissible={true}
        >
          <DrawerTrigger asChild>
            <div className={`cursor-pointer ${className || ''}`}>
              {children}
            </div>
          </DrawerTrigger>
          <DrawerContent className="max-h-[95vh]" data-testid="zap-modal">
            <DrawerHeader className="text-center relative">
              {invoice && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInvoice(null);
                    setQrCodeUrl('');
                  }}
                  className="absolute left-4 top-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}

              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="absolute right-4 top-4">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>

              <DrawerTitle className="text-lg pt-2">
                {invoice ? '⚡ Pay Invoice' : '⚡ Send a Zap'}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-center">
                {invoice ? 'Complete your Lightning payment' : 'Support this creator with sats'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <ZapContent {...contentProps} />
            </div>
          </DrawerContent>
        </Drawer>

      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div className={`cursor-pointer ${className || ''}`}>
            {children}
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] max-h-[95vh] overflow-hidden" data-testid="zap-modal">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {invoice ? '⚡ Pay Invoice' : '⚡ Send a Zap'}
            </DialogTitle>
            <DialogDescription className="text-sm text-center">
              {invoice ? 'Complete your Lightning payment' : 'Support this creator with sats'}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh]">
            <ZapContent {...contentProps} />
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
