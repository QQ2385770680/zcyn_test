/**
 * Marketplace — 方案市场页面
 * 设计风格：清新简洁，卡片网格展示可购买的方案
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  ShoppingCart,
  Star,
  Download,
  Eye,
  TrendingUp,
  Filter,
  Crown,
} from "lucide-react";

interface MarketPlan {
  id: string;
  name: string;
  author: string;
  description: string;
  price: number;
  rating: number;
  downloads: number;
  profit: number;
  tags: string[];
  isPro: boolean;
}

const marketPlans: MarketPlan[] = [
  {
    id: "1",
    name: "全期最优利润方案 v2.1",
    author: "决策大师",
    description: "经过多轮优化的 8 期完整排产方案，利润最大化策略",
    price: 0,
    rating: 4.8,
    downloads: 256,
    profit: 385000,
    tags: ["利润优化", "全期"],
    isPro: false,
  },
  {
    id: "2",
    name: "低风险稳健方案",
    author: "稳赢队",
    description: "控制库存和加班成本，适合风险厌恶型团队",
    price: 50,
    rating: 4.5,
    downloads: 128,
    profit: 295000,
    tags: ["低风险", "稳健"],
    isPro: false,
  },
  {
    id: "3",
    name: "Pro 冠军方案",
    author: "无双引擎",
    description: "基于历届冠军团队策略的高级优化方案",
    price: 200,
    rating: 5.0,
    downloads: 64,
    profit: 420000,
    tags: ["冠军策略", "高级"],
    isPro: true,
  },
  {
    id: "4",
    name: "快速入门模板",
    author: "新手教练",
    description: "适合初次参赛团队的基础排产模板",
    price: 0,
    rating: 4.2,
    downloads: 512,
    profit: 180000,
    tags: ["入门", "模板"],
    isPro: false,
  },
];

export default function Marketplace() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
            <ShoppingCart className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">方案市场</h1>
            <p className="text-sm text-gray-500">浏览和获取其他用户分享的优质决策方案</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="搜索方案名称、作者或标签..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="size-3.5" />
          筛选
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketPlans.map((plan) => (
          <MarketPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function MarketPlanCard({ plan }: { plan: MarketPlan }) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-gray-100 relative overflow-hidden">
      {plan.isPro && (
        <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-400 to-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
          PRO
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {plan.isPro && <Crown className="size-3.5 text-amber-500" />}
          {plan.name}
        </CardTitle>
        <p className="text-xs text-gray-400">by {plan.author}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{plan.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {plan.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Star className="size-3 text-amber-400 fill-amber-400" />
            {plan.rating}
          </span>
          <span className="flex items-center gap-1">
            <Download className="size-3" />
            {plan.downloads}
          </span>
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <TrendingUp className="size-3" />
            {plan.profit.toLocaleString()} 元
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-900">
            {plan.price === 0 ? "免费" : `${plan.price} 积分`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Eye className="size-3" />
              预览
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700">
              <Download className="size-3" />
              获取
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
