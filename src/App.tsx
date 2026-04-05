/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { 
  Activity, 
  ChevronRight, 
  Heart, 
  Info, 
  RefreshCw, 
  Utensils, 
  Dumbbell, 
  Droplets, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Smile,
  Meh,
  Frown,
  MessageSquare,
  Sparkles,
  Calendar,
  Send,
  UserCircle,
  History,
  PlayCircle,
  Moon,
  Sun,
  Flame,
  Thermometer,
  Angry,
  Cloud,
  Settings,
  Palette,
  Save,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Bell,
  FileSpreadsheet,
  ClipboardList,
  Trophy,
  Timer,
  Zap,
  Music,
  Headphones,
  BookOpen,
  Award,
  Target,
  MapPin,
  Navigation,
  Wind,
  Coffee,
  SunMedium,
  Plus,
  Minus,
  LogIn,
  LogOut,
  CloudRain,
  Waves,
  Scale,
  Apple,
  Download,
  User,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";
import { cn } from "./lib/utils";

// --- Types ---

type AppStep = "loading" | "login" | "profile_setup" | "loading_after_setup" | "dashboard" | "input" | "result" | "vital_mind" | "nutrition" | "history" | "exercise" | "mood_history";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Mood = "happy" | "joyful" | "sad" | "anxious" | "angry" | "sick";
type NutritionGoal = "weight_loss" | "weight_gain" | "maintenance" | "muscle_gain" | "cutting" | "eat_clean";

interface SchoolProfile {
  school: string;
  role: "student";
  grade?: string;
  className?: string;
}

interface SportChallenge {
  id: string;
  title: string;
  description: string;
  category?: string;
  points?: number;
  target?: number;
  current?: number;
  unit?: string;
  deadline?: string;
  completed?: boolean;
  type?: "daily" | "weekly";
}

interface SleepEntry {
  date: string;
  hours: number;
  quality: "good" | "normal" | "poor";
  note?: string;
  advice?: string;
}

interface UserProfile {
  name: string;
  email: string;
  gender: "male" | "female";
  age: number;
  height: number; // in cm
  weight: number; // in kg
  activity: ActivityLevel;
  favoriteSport?: string;
  moodHistory: MoodEntry[];
  gratitudeJournal: GratitudeEntry[];
  sleepHistory: SleepEntry[];
  challenges: SportChallenge[];
  school?: string;
  className?: string;
}

interface GratitudeEntry {
  date: string;
  items: string[];
}

interface BMIEntry {
  date: string;
  weight: number;
  height: number;
  score: number;
  category: string;
  label: string;
  color: string;
}

interface BMIResult {
  score: number;
  category: "underweight" | "normal" | "overweight" | "obese";
  label: string;
  color: string;
  description: string;
  nutrition: string[];
  exercise: string[];
}

interface MoodEntry {
  date: string; // ISO date
  mood: Mood;
  note?: string;
  followUp?: string;
}

interface NutritionEntry {
  date: string;
  goal: NutritionGoal;
  advice: string;
  waterIntake: number; // glasses
}

interface WorkoutEntry {
  date: string;
  sportId: string;
  sportName: string;
  duration: number; // in minutes
  intensity: "low" | "moderate" | "high";
  note?: string;
}

interface ThemeConfig {
  color: string;
}

interface RelaxationExercise {
  title: string;
  duration: string;
  description: string;
  icon: React.ReactNode;
}

// --- Constants ---

const POSITIVE_QUOTES = [
  "Sức khỏe là tài sản lớn nhất của bạn.",
  "Mỗi bước đi nhỏ hôm nay là một bước tiến lớn cho ngày mai.",
  "Hãy yêu thương bản thân mình trước khi yêu thương bất kỳ ai khác.",
  "Uống đủ nước giúp não bộ hoạt động tốt hơn 14%.",
  "Nụ cười là liều thuốc bổ miễn phí tốt nhất.",
  "Học sinh TeenCare luôn tràn đầy năng lượng!",
  "Căng thẳng chỉ là tạm thời, sức bền là mãi mãi.",
  "Phản ứng hóa học xảy ra trong não có đủ điện để thắp sáng một bóng đèn led."
];

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Ít vận động",
  light: "Vận động nhẹ",
  moderate: "Vận động vừa",
  active: "Vận động nhiều",
  very_active: "Vận động rất nhiều",
};


const MOOD_CONFIG: Record<Mood, { label: string; color: string; icon: any }> = {
  happy: { label: "Vui vẻ", color: "text-green-500", icon: Smile },
  joyful: { label: "Hạnh phúc", color: "text-pink-500", icon: Heart },
  sad: { label: "Buồn bã", color: "text-blue-500", icon: Frown },
  anxious: { label: "Lo lắng", color: "text-yellow-500", icon: Meh },
  angry: { label: "Giận dữ", color: "text-red-500", icon: Angry },
  sick: { label: "Bị ốm", color: "text-green-500", icon: Thermometer },
};

interface Resource {
  title: string;
  type: "article" | "video";
  url: string;
  category: string;
}

const VITAL_MIND_PODCASTS = [
  { id: "p1", title: "Hít thở sâu giảm stress", duration: "3:45", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", author: "TeenCare Team" },
  { id: "p2", title: "Tập trung học tập", duration: "5:12", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", author: "TeenCare Team" },
  { id: "p3", title: "Thư giãn trước khi ngủ", duration: "4:20", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", author: "TeenCare Team" },
];

const WHITE_NOISE_SOUNDS = [
  { id: "s1", title: "Tiếng mưa rơi", icon: "🌧️", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "s2", title: "Sóng biển rì rào", icon: "🌊", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "s3", title: "Tiếng rừng đêm", icon: "🌲", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
];

const SPORT_CHALLENGES_LIST: SportChallenge[] = [
  { id: "c1", title: "Thử thách 5000 bước", description: "Đi bộ ít nhất 5000 bước mỗi ngày trong 1 tuần.", category: "running", points: 100 },
  { id: "c2", title: "Vua cầu lông", description: "Tập luyện cầu lông ít nhất 30 phút mỗi ngày trong 3 ngày liên tiếp.", category: "badminton", points: 150 },
  { id: "c3", title: "Chiến binh bóng rổ", description: "Thực hiện 50 cú ném rổ mỗi ngày trong 5 ngày.", category: "basketball", points: 200 },
  { id: "c4", title: "Siêu sao bóng đá", description: "Tập sút bóng trúng đích 30 lần mỗi ngày.", category: "football", points: 180 },
  { id: "c5", title: "Bậc thầy bóng bàn", description: "Tập tâng bóng bằng vợt 100 lần không rơi.", category: "table_tennis", points: 120 },
  { id: "c6", title: "Kỷ lục gia Gym", description: "Hoàn thành 3 buổi tập Gym toàn thân trong tuần.", category: "gym", points: 250 },
  { id: "c7", title: "Đôi chân khéo léo", description: "Tâng cầu liên tục 50 lần bằng cả hai chân.", category: "shuttlecock", points: 140 },
  { id: "c8", title: "Phượng hoàng bóng chuyền", description: "Tập phát bóng qua lưới 20 lần liên tiếp.", category: "volleyball", points: 160 },
];

const SPORTS_CONFIG: Record<string, { 
  id: string; 
  name: string; 
  icon: any; 
  color: string; 
  bg: string; 
  description: string;
  diet: string;
  training: string;
  videos: { title: string; url: string; thumbnail: string }[];
}> = {
  running: {
    id: "running",
    name: "Chạy bộ",
    icon: Trophy,
    color: "text-blue-500",
    bg: "bg-blue-50",
    description: "Tăng cường sức bền và tim mạch.",
    diet: "Ăn nhiều tinh bột (cơm, bún) trước khi chạy 2-3 tiếng. Bổ sung nước và điện giải.",
    training: "Bắt đầu với 15-20 phút chạy nhẹ, tăng dần 10% quãng đường mỗi tuần.",
    videos: [
      { title: "Kỹ thuật chạy bộ đúng cách cho người mới", url: "https://youtu.be/YxZ3pwe_EjA?si=zCfHHyylvmiePU1j", thumbnail: "https://img.youtube.com/vi/YxZ3pwe_EjA/hqdefault.jpg" },
      { title: "Cách hít thở khi chạy bộ không bị mệt", url: "https://youtu.be/sWurttqIG60?si=zY1cV8aQryR4odj8", thumbnail: "https://img.youtube.com/vi/sWurttqIG60/hqdefault.jpg" }
    ]
  },
  table_tennis: {
    id: "table_tennis",
    name: "Bóng bàn",
    icon: Trophy,
    color: "text-orange-500",
    bg: "bg-orange-50",
    description: "Rèn luyện phản xạ và sự tập trung.",
    diet: "Bổ sung Vitamin A cho mắt và các loại hạt để tăng sự tập trung.",
    training: "Tập các bài đánh cơ bản: đẩy bóng, giật bóng và giao bóng.",
    videos: [
      { title: "Hướng dẫn kỹ thuật bóng bàn cơ bản", url: "https://youtu.be/jwxolZEGGqQ?si=E_7ziI820I1Q-kc_", thumbnail: "https://img.youtube.com/vi/jwxolZEGGqQ/hqdefault.jpg" },
      { title: "Các bài tập bổ trợ bóng bàn hiệu quả", url: "https://youtu.be/5w55Yz0KkJk?si=Y7zaBlJ_UUy5e2iO", thumbnail: "https://img.youtube.com/vi/5w55Yz0KkJk/hqdefault.jpg" }
    ]
  },
  football: {
    id: "football",
    name: "Bóng đá",
    icon: Trophy,
    color: "text-green-500",
    bg: "bg-green-50",
    description: "Phát triển thể lực toàn diện và tinh thần đồng đội.",
    diet: "Tăng cường Protein và tinh bột phức hợp (yến mạch, gạo lứt).",
    training: "Tập sút bóng, chuyền bóng và các bài tập chạy biến tốc.",
    videos: [
      { title: "Kỹ thuật đá bóng cơ bản cho học sinh", url: "https://youtu.be/BktU57QCZ_8?si=nW1WOIYPvmLcb4It", thumbnail: "https://img.youtube.com/vi/BktU57QCZ_8/hqdefault.jpg" },
      { title: "Các bài tập bổ trợ thể lực bóng đá", url: "https://youtu.be/4hWJ5vDldx0?si=28vmjSoubrn0DRy4", thumbnail: "https://img.youtube.com/vi/4hWJ5vDldx0/hqdefault.jpg" }
    ]
  },
  basketball: {
    id: "basketball",
    name: "Bóng rổ",
    icon: Trophy,
    color: "text-orange-600",
    bg: "bg-orange-50",
    description: "Phát triển chiều cao và sự linh hoạt.",
    diet: "Tăng cường Canxi và Protein (sữa, trứng, ức gà).",
    training: "Tập ném rổ, dẫn bóng và các bài tập bật nhảy.",
    videos: [
      { title: "Kỹ thuật dẫn bóng và ném rổ cơ bản", url: "https://youtu.be/RKmbNTKV-zQ?si=nZ5qSNxWS2kI6Bdu", thumbnail: "https://img.youtube.com/vi/RKmbNTKV-zQ/hqdefault.jpg" },
      { title: "Các bài tập tăng chiều cao với bóng rổ", url: "https://youtu.be/Itvcjjze6So?si=0GBIzlJZl_0A-ihh", thumbnail: "https://img.youtube.com/vi/Itvcjjze6So/hqdefault.jpg" }
    ]
  },
  volleyball: {
    id: "volleyball",
    name: "Bóng chuyền",
    icon: Trophy,
    color: "text-sky-500",
    bg: "bg-sky-50",
    description: "Tăng cường sức mạnh đôi tay và khả năng phối hợp.",
    diet: "Bổ sung thực phẩm giàu Magie và Kali để tránh chuột rút.",
    training: "Tập đệm bóng, chuyền bóng cao tay và phát bóng.",
    videos: [
      { title: "Kỹ thuật đệm bóng và chuyền bóng thấp tay", url: "https://youtu.be/VivIeu7UIH4?si=4e_eZa-6fRKZTAv3", thumbnail: "https://img.youtube.com/vi/VivIeu7UIH4/hqdefault.jpg" },
      { title: "Hướng dẫn phát bóng chuyền đúng kỹ thuật", url: "https://youtu.be/N1DU8qkl2p4?si=qlCkE6xvU96OJKhn", thumbnail: "https://img.youtube.com/vi/N1DU8qkl2p4/hqdefault.jpg" }
    ]
  },
  badminton: {
    id: "badminton",
    name: "Cầu lông",
    icon: Trophy,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    description: "Rèn luyện phản xạ và sự linh hoạt.",
    diet: "Ăn nhẹ trước khi tập. Bổ sung chuối và nước lọc.",
    training: "Tập các bài di chuyển bước chân và kỹ thuật đập cầu.",
    videos: [
      { title: "Hướng dẫn kỹ thuật cầu lông cơ bản", url: "https://youtu.be/Jl24wtYy7IQ?si=kT-CAPri1AQamoac", thumbnail: "https://img.youtube.com/vi/Jl24wtYy7IQ/hqdefault.jpg" },
      { title: "Kỹ thuật di chuyển bước chân trong cầu lông", url: "https://youtu.be/UppSk0FZORA?si=q_HUx4OqqpNAbI8b", thumbnail: "https://img.youtube.com/vi/UppSk0FZORA/hqdefault.jpg" }
    ]
  },
  shuttlecock: {
    id: "shuttlecock",
    name: "Đá cầu",
    icon: Trophy,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    description: "Rèn luyện sự khéo léo của đôi chân.",
    diet: "Bổ sung Vitamin nhóm B để tăng cường năng lượng.",
    training: "Tập tâng cầu, chuyền cầu và các kỹ thuật tấn công bằng chân.",
    videos: [
      { title: "Kỹ thuật đá cầu cơ bản cho người mới", url: "https://youtu.be/nM7Y21b0c3I?si=aBZQlbUtDke5jYhv", thumbnail: "https://img.youtube.com/vi/nM7Y21b0c3I/hqdefault.jpg" },
      { title: "Các bài tập tâng cầu và chuyền cầu", url: "https://youtu.be/KQrtSrSEJmA?si=G3Y_aLAhtoBRAZyX", thumbnail: "https://img.youtube.com/vi/KQrtSrSEJmA/hqdefault.jpg" }
    ]
  },
  gym: {
    id: "gym",
    name: "Tập Gym",
    icon: Trophy,
    color: "text-rose-500",
    bg: "bg-rose-50",
    description: "Phát triển cơ bắp và sức mạnh hình thể.",
    diet: "Tăng cường Protein (thịt bò, trứng, whey) và chất béo tốt.",
    training: "Tập theo các nhóm cơ: ngực, lưng, chân, vai, tay.",
    videos: [
      { title: "Lịch tập Gym cho người mới bắt đầu", url: "https://youtu.be/UswHz7_nvZQ?si=1DUow4gAMDfTO_Rx", thumbnail: "https://img.youtube.com/vi/UswHz7_nvZQ/hqdefault.jpg" },
      { title: "Kỹ thuật các bài tập cơ bản trong Gym", url: "https://youtu.be/ADc8TaxAVMU?si=dsMJuyKJmpvQSu4m", thumbnail: "https://img.youtube.com/vi/ADc8TaxAVMU/hqdefault.jpg" }
    ]
  }
};

const NUTRITION_RESOURCES: Record<NutritionGoal, Resource[]> = {
  weight_loss: [
    { title: "Hướng dẫn giảm cân hiệu quả", type: "video", url: "https://share.google/Yun2xfFc6dQB9dShg", category: "Giảm cân" },
    { title: "Cardio 10 phút", type: "video", url: "https://share.google/o3sM4I5QFCNHVaP01", category: "Giảm cân" }
  ],
  weight_gain: [
    { title: "Chế độ ăn tăng cân lành mạnh và an toàn cho sức khỏe", type: "article", url: "https://share.google/ZefuzSVwLCUzxtb0L", category: "Tăng cân" },
    { title: "Thực đơn tăng cân cho người gầy hiệu quả, ngon miệng, ít tốn kém", type: "article", url: "https://share.google/njT03lMTbW7nW8qiE", category: "Tăng cân" }
  ],
  maintenance: [
    { title: "Cách nào giữ dáng ở mọi lứa tuổi? | Vinmec", type: "article", url: "https://share.google/xazuroVmszWVXdtQL", category: "Duy trì" },
    { title: "Cách xây dựng một chế độ ăn uống lành mạnh, cân bằng | Vinmec", type: "article", url: "https://share.google/Fr3qaQM1YNqxp37BE", category: "Duy trì" }
  ],
  muscle_gain: [
    { title: "10 thực phẩm hỗ trợ tăng cơ mà bạn nên bổ sung vào chế độ ăn | ELLE Man", type: "article", url: "https://share.google/XQLbwV6O690tk27GF", category: "Tăng cơ" },
    { title: "5 Bài Tập Gym Tăng Cơ Hiệu Quả Nhất Cho Người Mới Bắt Đầu", type: "video", url: "https://share.google/MG92gw2imk8JsrxfK", category: "Tăng cơ" }
  ],
  cutting: [
    { title: "5 phương pháp giảm mỡ thừa nhưng giữ được khối lượng cơ - Nhà thuốc FPT Long Châu", type: "article", url: "https://share.google/gsjs6of2YmBk2MdkE", category: "Giảm mỡ" },
    { title: "Làm sao để giảm cân mà vẫn giữ cơ?", type: "article", url: "https://share.google/iFlPMRXF5V8HJHXjV", category: "Giảm mỡ" }
  ],
  eat_clean: [
    { title: "Eat Clean VN | Lối ăn uống lành mạnh giúp cải thiện sức khỏe", type: "article", url: "https://share.google/cFEcaF1G7jOpCiQ0m", category: "Eat Clean" },
    { title: "THỰC ĐƠN EAT CLEAN 7 NGÀY VÀ LỢI ÍCH KHI ÁP DỤNG CHẾ ĐỘ ĂN SẠCH", type: "article", url: "https://share.google/eOfYFIDjA9tjXZ1te", category: "Eat Clean" }
  ]
};

const NUTRITION_GOALS: Record<NutritionGoal, { label: string; description: string; color: string }> = {
  weight_loss: { label: "Giảm cân", description: "Giảm mỡ, thâm hụt calo", color: "text-orange-500" },
  weight_gain: { label: "Tăng cân", description: "Tăng khối lượng cơ thể", color: "text-blue-500" },
  maintenance: { label: "Duy trì", description: "Cân bằng & Đa dạng", color: "text-green-500" },
  muscle_gain: { label: "Tăng cơ", description: "Giàu Protein & Tập nặng", color: "text-indigo-500" },
  cutting: { label: "Giảm mỡ", description: "Giảm mỡ nhưng giữ cơ", color: "text-rose-500" },
  eat_clean: { label: "Eat Clean", description: "Ăn sạch & Lành mạnh", color: "text-emerald-500" },
};

const THEME_OPTIONS = [
  { name: 'Sky Blue', value: 'sky', color: 'bg-sky-500' },
  { name: 'Emerald Green', value: 'emerald', color: 'bg-emerald-500' },
  { name: 'Amber Gold', value: 'amber', color: 'bg-amber-500' },
  { name: 'Rose Pink', value: 'rose', color: 'bg-rose-500' },
  { name: 'Indigo Night', value: 'indigo', color: 'bg-indigo-500' },
];

const getThemeClasses = (color: string) => ({
  bg50: `bg-${color}-50`,
  bg100: `bg-${color}-100`,
  bg100_50: `bg-${color}-100/50`,
  bg200: `bg-${color}-200`,
  bg200_20: `bg-${color}-200/20`,
  bg400: `bg-${color}-400`,
  bg500: `bg-${color}-500`,
  bg600: `bg-${color}-600`,
  bg700: `bg-${color}-700`,
  text100: `text-${color}-100`,
  text300: `text-${color}-300`,
  text400: `text-${color}-400`,
  text500: `text-${color}-500`,
  text600: `text-${color}-600`,
  text700: `text-${color}-700`,
  text800: `text-${color}-800`,
  text900: `text-${color}-900`,
  border50: `border-${color}-50`,
  border100: `border-${color}-100`,
  border400: `border-${color}-400`,
  hoverBg700: `hover:bg-${color}-700`,
  hoverBg100: `hover:bg-${color}-100`,
  ring400: `focus:ring-${color}-400`,
  fill500: `fill-${color}-500`,
});

// --- AI Service ---

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const formatGreetingName = (name: string) => {
  if (!name) return "bạn";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 3) {
    return parts.slice(-2).join(" ");
  }
  return name;
};

const formatSchoolName = (school: string) => {
  if (!school) return null;
  
  // Case: Trường THPT Chuyên X -> THPT Chuyên \n X
  if (school.startsWith("Trường THPT Chuyên")) {
    const name = school.replace("Trường THPT Chuyên", "").trim();
    return (
      <div className="flex flex-col items-end">
        <span className="block">THPT Chuyên</span>
        <span className="block">{name}</span>
      </div>
    );
  }
  
  // Case: THPT Chuyên X -> THPT Chuyên \n X
  if (school.startsWith("THPT Chuyên")) {
    const name = school.replace("THPT Chuyên", "").trim();
    return (
      <div className="flex flex-col items-end">
        <span className="block">THPT Chuyên</span>
        <span className="block">{name}</span>
      </div>
    );
  }

  // Case: Trường THPT X -> Trường THPT \n X
  if (school.startsWith("Trường THPT")) {
    const name = school.replace("Trường THPT", "").trim();
    return (
      <div className="flex flex-col items-end">
        <span className="block">Trường THPT</span>
        <span className="block">{name}</span>
      </div>
    );
  }
  
  // Default: Keep as is (handles "THPT Cao Lãnh" etc.)
  return <span className="block">{school}</span>;
};

// --- Dashboard Component ---

interface DashboardProps {
  profile: UserProfile;
  bmiHistory: BMIEntry[];
  moodHistory: MoodEntry[];
  nutritionHistory: NutritionEntry[];
  onNavigate: (step: AppStep) => void;
  onShowSettings: () => void;
}

function Dashboard({ profile, bmiHistory, moodHistory, nutritionHistory, onNavigate, onShowSettings }: DashboardProps) {
  const lastBMI = useMemo(() => {
    if (bmiHistory.length > 0) return bmiHistory[0];
    if (profile.height > 0 && profile.weight > 0) {
      const heightInMeters = profile.height / 100;
      const score = profile.weight / (heightInMeters * heightInMeters);
      let label = "Bình thường";
      let color = "text-emerald-500";
      if (score < 18.5) { label = "Thiếu cân"; color = "text-sky-500"; }
      else if (score >= 23 && score < 25) { label = "Thừa cân"; color = "text-orange-500"; }
      else if (score >= 25) { label = "Béo phì"; color = "text-red-500"; }
      return { score, label, color, date: new Date().toISOString(), weight: profile.weight, height: profile.height, category: "normal" as any };
    }
    return null;
  }, [bmiHistory, profile]);

  const lastMood = moodHistory[0];
  const lastNutrition = nutritionHistory[0];

  const bmiTrend = useMemo(() => {
    if (bmiHistory.length < 2) return null;
    const current = bmiHistory[0].score;
    const previous = bmiHistory[1].score;
    const diff = current - previous;
    return {
      value: Math.abs(diff).toFixed(1),
      isUp: diff > 0,
      isDown: diff < 0
    };
  }, [bmiHistory]);

  const moodConfig = lastMood ? MOOD_CONFIG[lastMood.mood] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-slate-800">
            Chào, {formatGreetingName(profile.name)}!
          </h2>
          <p className="text-slate-500 font-medium">Tổng quan sức khỏe hôm nay</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 shadow-sm">
          <Save size={10} />
          <span>Đã lưu cục bộ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* BMI Card */}
        <div 
          onClick={() => onNavigate("input")}
          className="glass p-6 rounded-[32px] space-y-4 cursor-pointer hover:shadow-lg transition-all border-l-4 border-blue-500 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Activity className="text-blue-500" size={20} />
              </div>
              <div className="flex items-center gap-1.5">
                <Activity size={12} className="text-blue-500" />
                <p className="font-bold text-slate-700">Chỉ số BMI</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </div>
          
          {lastBMI ? (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-black text-slate-800">{lastBMI.score.toFixed(1)}</p>
                <p className={cn("text-sm font-bold", lastBMI.color)}>{lastBMI.label}</p>
              </div>
              {bmiTrend && (
                <div className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold",
                  bmiTrend.isUp ? "bg-red-50 text-red-500" : bmiTrend.isDown ? "bg-green-50 text-green-500" : "bg-slate-50 text-slate-500"
                )}>
                  {bmiTrend.isUp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {bmiTrend.value}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-black text-slate-300">0.0</p>
                <p className="text-sm font-bold text-slate-300 italic">Chưa có dữ liệu</p>
              </div>
            </div>
          )}
        </div>

        {/* Mood Card */}
        <div 
          onClick={() => onNavigate("vital_mind")}
          className="glass p-6 rounded-[32px] space-y-4 cursor-pointer hover:shadow-lg transition-all border-t-4 border-sky-400 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center">
              <MessageSquare className="text-sky-500" size={20} />
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} className="text-sky-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tâm lý Học đường</p>
            </div>
            {moodConfig ? (
              <div className="flex items-center gap-2 mt-1">
                <moodConfig.icon className={moodConfig.color} size={20} />
                <p className="font-bold text-slate-700">{moodConfig.label}</p>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-700 mt-1">Cập nhật ngay</p>
            )}
          </div>
        </div>

        {/* Nutrition Card */}
        <div 
          onClick={() => onNavigate("nutrition")}
          className="glass p-6 rounded-[32px] space-y-4 cursor-pointer hover:shadow-lg transition-all border-t-4 border-emerald-400 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Utensils className="text-emerald-500" size={20} />
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Apple size={12} className="text-emerald-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dinh dưỡng</p>
            </div>
            {lastNutrition ? (
              <div className="flex items-center gap-2 mt-1">
                <Droplets className="text-blue-500" size={16} />
                <p className="font-bold text-slate-700">{lastNutrition.waterIntake} ly nước</p>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-700 mt-1">Lên kế hoạch</p>
            )}
          </div>
        </div>

        {/* Exercise Card */}
        <div 
          onClick={() => onNavigate("exercise")}
          className="glass p-6 rounded-[32px] space-y-4 cursor-pointer hover:shadow-lg transition-all border-t-4 border-orange-400 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Dumbbell className="text-orange-500" size={20} />
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Dumbbell size={12} className="text-orange-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tập luyện & Vận động</p>
            </div>
            <p className="text-sm font-bold text-slate-700 mt-1">Hướng dẫn tập Gym & Thể thao hàng ngày</p>
          </div>
        </div>

        {/* Daily Insight */}
        <div className="bg-slate-900 rounded-[32px] p-6 text-white space-y-4 relative overflow-hidden md:col-span-2 lg:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="flex items-center gap-2 relative z-10">
            <Sparkles className="text-amber-400" size={20} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Gợi ý hôm nay</p>
          </div>
          <p className="text-lg font-medium leading-relaxed relative z-10">
            "{POSITIVE_QUOTES[Math.floor(Math.random() * POSITIVE_QUOTES.length)]}"
          </p>
          <button 
            onClick={() => onNavigate("history")}
            className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors relative z-10"
          >
            Xem lịch sử chi tiết <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Công cụ nhanh</p>
        <div className="space-y-2">
          <button 
            onClick={() => onShowSettings()}
            className="w-full glass p-4 rounded-2xl flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Palette className="text-indigo-500" size={16} />
              </div>
              <p className="text-sm font-bold text-slate-700">Tùy chỉnh giao diện</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => onNavigate("history")}
            className="w-full glass p-4 rounded-2xl flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <History className="text-amber-500" size={16} />
              </div>
              <p className="text-sm font-bold text-slate-700">Xem lại tiến trình</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Exercise Screen Component ---

interface ExerciseScreenProps {
  profile: UserProfile;
  onLogWorkout: (entry: WorkoutEntry) => void;
  onBack: () => void;
  theme: any;
}

function ExerciseScreen({ profile, onLogWorkout, onBack, theme }: ExerciseScreenProps) {
  const [selectedSportId, setSelectedSportId] = useState<string | null>(profile.favoriteSport || null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<"low" | "moderate" | "high">("moderate");
  const [note, setNote] = useState("");

  const selectedSport = selectedSportId ? SPORTS_CONFIG[selectedSportId] : null;

  const handleLogWorkout = () => {
    if (!selectedSport) return;
    const entry: WorkoutEntry = {
      date: new Date().toISOString(),
      sportId: selectedSport.id,
      sportName: selectedSport.name,
      duration,
      intensity,
    };
    if (note.trim()) {
      entry.note = note.trim();
    }
    onLogWorkout(entry);
    setShowLogForm(false);
    setNote("");
  };

  const handleGetAiAdvice = async (question?: string) => {
    if (!selectedSport) return;
    setIsAiLoading(true);
    
    try {
      const prompt = question 
        ? `Người dùng đang tập môn ${selectedSport.name}. Câu hỏi của họ: "${question}". Hãy đưa ra lời khuyên chuyên sâu.`
        : `Hãy đưa ra lời khuyên tổng quan về chế độ tập luyện và dinh dưỡng cho môn ${selectedSport.name} dành cho học sinh ${profile.age} tuổi, giới tính ${profile.gender === 'male' ? 'Nam' : 'Nữ'}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `Bạn là một huấn luyện viên thể thao chuyên nghiệp cho môn ${selectedSport.name}. Hãy đưa ra lời khuyên chi tiết, khoa học và dễ hiểu. Bỏ hết các dấu * trong câu trả lời.`,
        }
      });

      const adviceText = (response.text || "Xin lỗi, tôi không thể đưa ra lời khuyên lúc này.").replace(/\*/g, '');
      setAiAdvice(adviceText);
      setChatInput("");
    } catch (error) {
      console.error("AI Error:", error);
      const fallbackAdvice = `Chào bạn, mình là trợ lý TeenCare. Có vẻ như kết nối của mình đang gặp chút gián đoạn, nhưng đừng lo lắng nhé!

Dưới đây là một vài lời khuyên chung cho môn ${selectedSport.name}:
- Luôn khởi động kỹ ít nhất 10-15 phút trước khi tập.
- Uống đủ nước trong suốt quá trình tập luyện.
- Lắng nghe cơ thể và không tập quá sức.
- Chú ý đến kỹ thuật đúng để tránh chấn thương.

Hãy thử lại sau ít phút để mình có thể đưa ra lời khuyên chi tiết hơn nhé!`;
      setAiAdvice(fallbackAdvice);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSport && !aiAdvice) {
      handleGetAiAdvice();
    }
  }, [selectedSportId]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Tập luyện thể thao</h2>
      </div>

      {!selectedSport ? (
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Chọn môn thể thao của bạn</p>
          <div className="grid grid-cols-1 gap-3">
            {Object.values(SPORTS_CONFIG).map((sport) => (
              <button
                key={sport.id}
                onClick={() => setSelectedSportId(sport.id)}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-[32px] transition-all hover:scale-[1.02] active:scale-[0.98] text-left",
                  sport.bg
                )}
              >
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <sport.icon className={sport.color} size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">{sport.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{sport.description}</p>
                </div>
                <ChevronRight className="text-slate-300" size={20} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
      {/* Sport Header */}
      <div className={cn("p-6 rounded-[40px] relative overflow-hidden", theme.bg100)}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <selectedSport.icon className={theme.text500} size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{selectedSport.name}</h3>
              <button 
                onClick={() => { setSelectedSportId(null); setAiAdvice(""); }}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600"
              >
                Thay đổi môn tập
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowLogForm(true)}
            className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all active:scale-95", theme.bg500)}
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Log Workout Form Modal */}
      <AnimatePresence>
        {showLogForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogForm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 relative z-10 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4", theme.bg100)}>
                  <selectedSport.icon className={theme.text500} size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Ghi lại buổi tập</h3>
                <p className="text-sm text-slate-400">Bạn đã tập luyện thế nào hôm nay?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Thời gian (phút)</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
                    <button 
                      onClick={() => setDuration(Math.max(5, duration - 5))}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600"
                    >
                      <Minus size={18} />
                    </button>
                    <div className="flex-1 text-center font-bold text-slate-700">{duration} phút</div>
                    <button 
                      onClick={() => setDuration(duration + 5)}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Cường độ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'low', label: 'Nhẹ', color: 'emerald' },
                      { id: 'moderate', label: 'Vừa', color: 'orange' },
                      { id: 'high', label: 'Cao', color: 'rose' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setIntensity(opt.id as any)}
                        className={cn(
                          "py-3 rounded-2xl text-xs font-bold transition-all border-2",
                          intensity === opt.id 
                            ? `bg-${opt.color}-50 border-${opt.color}-200 text-${opt.color}-600` 
                            : "bg-white border-transparent text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Ghi chú (tùy chọn)</label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Hôm nay bạn cảm thấy thế nào?"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-400 outline-none min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowLogForm(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleLogWorkout}
                  className={cn("flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95", theme.bg500)}
                >
                  Lưu buổi tập
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Diet & Training */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-6 rounded-3xl space-y-3">
          <div className={cn("flex items-center gap-2", theme.text500)}>
            <Utensils size={20} />
            <h4 className="font-bold">Chế độ ăn uống</h4>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{selectedSport.diet}</p>
        </div>
        <div className="glass p-6 rounded-3xl space-y-3">
          <div className={cn("flex items-center gap-2", theme.text500)}>
            <Dumbbell size={20} />
            <h4 className="font-bold">Chế độ tập luyện</h4>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{selectedSport.training}</p>
        </div>
      </div>

          {/* Reference Materials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tài liệu tham khảo</h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{selectedSport.videos.length} Tài liệu</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
              {selectedSport.videos.map((video, idx) => (
                <a 
                  key={idx} 
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-[240px] space-y-3 block group"
                >
                  <div className="aspect-video rounded-2xl overflow-hidden relative group cursor-pointer">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <PlayCircle className="text-white opacity-80 group-hover:opacity-100 transition-all" size={40} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

      {/* AI Chat Advice */}
      <div className={cn("glass p-6 rounded-[32px] space-y-4 border-t-4", theme.border400)}>
        <div className="flex items-center gap-2">
          <Sparkles className={theme.text500} size={20} />
          <h4 className="font-bold text-slate-800">Tư vấn chuyên gia AI</h4>
        </div>
            
            <div className="bg-slate-50/50 rounded-2xl p-4 min-h-[100px] relative">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <RefreshCw className="animate-spin text-blue-400" size={24} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang phân tích...</p>
                </div>
              ) : (
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {aiAdvice || "Hãy đặt câu hỏi để nhận lời khuyên từ huấn luyện viên AI của bạn!"}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGetAiAdvice(chatInput)}
                placeholder="Hỏi về kỹ thuật, chấn thương..."
                className="flex-1 bg-white border-none rounded-2xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <button 
                onClick={() => handleGetAiAdvice(chatInput)}
                disabled={isAiLoading || !chatInput.trim()}
                className={cn("w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all disabled:opacity-50", theme.bg500, theme.hoverBg600)}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- History Screen Component ---

interface HistoryScreenProps {
  bmiHistory: BMIEntry[];
  moodHistory: MoodEntry[];
  nutritionHistory: NutritionEntry[];
  workoutHistory: WorkoutEntry[];
  sleepHistory: SleepEntry[];
  gratitudeEntries: GratitudeEntry[];
  onBack: () => void;
  onDelete: (type: "bmi" | "mood" | "nutrition" | "workout" | "sleep" | "gratitude", id: string) => void;
  onExportExcel: () => void;
  theme: any;
}

function HistoryScreen({ 
  bmiHistory, 
  moodHistory, 
  nutritionHistory, 
  workoutHistory, 
  sleepHistory,
  gratitudeEntries,
  onBack, 
  onDelete, 
  onExportExcel,
  theme 
}: HistoryScreenProps) {
  const [activeTab, setActiveTab] = useState<"bmi" | "mood" | "sleep" | "nutrition" | "workout" | "gratitude">("bmi");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
  };

  const groupEntriesByDate = <T extends { date: string }>(entries: T[]) => {
    const groups: Record<string, T[]> = {};
    entries.forEach(entry => {
      const { full } = formatDate(entry.date);
      if (!groups[full]) groups[full] = [];
      groups[full].push(entry);
    });
    return groups;
  };

  const sortedBmiHistory = [...bmiHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedMoodHistory = [...moodHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedNutritionHistory = [...nutritionHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedWorkoutHistory = [...workoutHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedSleepHistory = [...sleepHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedGratitudeHistory = [...gratitudeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const bmiGroups = groupEntriesByDate(sortedBmiHistory);
  const moodGroups = groupEntriesByDate(sortedMoodHistory);
  const nutritionGroups = groupEntriesByDate(sortedNutritionHistory);
  const workoutGroups = groupEntriesByDate(sortedWorkoutHistory);
  const sleepGroups = groupEntriesByDate(sortedSleepHistory);
  const gratitudeGroups = groupEntriesByDate(sortedGratitudeHistory);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Lịch sử chi tiết</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-all"
          >
            <FileSpreadsheet size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/50 rounded-2xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("bmi")}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === "bmi" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
          )}
        >
          <Activity size={18} /> BMI
        </button>
        <button
          onClick={() => setActiveTab("mood")}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === "mood" ? "bg-white shadow-sm text-sky-600" : "text-slate-400"
          )}
        >
          <MessageSquare size={18} /> Tâm lý
        </button>
        <button
          onClick={() => setActiveTab("sleep")}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === "sleep" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"
          )}
        >
          <Moon size={18} /> Giấc ngủ
        </button>
        <button
          onClick={() => setActiveTab("nutrition")}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === "nutrition" ? "bg-white shadow-sm text-green-600" : "text-slate-400"
          )}
        >
          <Utensils size={18} /> Dinh dưỡng
        </button>
        <button
          onClick={() => setActiveTab("workout")}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === "workout" ? "bg-white shadow-sm text-orange-600" : "text-slate-400"
          )}
        >
          <Dumbbell size={18} /> Tập luyện
        </button>
        <button
          onClick={() => setActiveTab("gratitude")}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === "gratitude" ? "bg-white shadow-sm text-pink-600" : "text-slate-400"
          )}
        >
          <Heart size={18} /> Biết ơn
        </button>
      </div>

      {/* Content */}
      <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {activeTab === "bmi" && (
          Object.keys(bmiGroups).length > 0 ? (
            Object.entries(bmiGroups).map(([date, entries]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry, idx) => {
                    const { time } = formatDate(entry.date);
                    const id = `bmi-${date}-${idx}`;
                    const isExpanded = expandedId === id;
                    return (
                      <div key={idx} className="glass rounded-3xl overflow-hidden relative group h-fit">
                        <div className="absolute right-4 top-5 flex items-center gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete("bmi", entry.date);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="w-full p-5 flex items-center justify-between text-left pr-12"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg", entry.color.replace('text', 'bg').replace('500', '100'), entry.color)}>
                              {entry.score.toFixed(1)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{entry.label}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                <Clock size={12} /> {time}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cân nặng</p>
                                  <p className="text-lg font-bold text-slate-700">{entry.weight} kg</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Chiều cao</p>
                                  <p className="text-lg font-bold text-slate-700">{entry.height} cm</p>
                                </div>
                              </div>
                              <p className="text-sm text-slate-500 italic leading-relaxed">
                                Kết quả BMI của bạn vào thời điểm này là {entry.score.toFixed(1)}, thuộc nhóm {entry.label.toLowerCase()}.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Activity size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có dữ liệu BMI</p>
            </div>
          )
        )}

        {activeTab === "mood" && (
          Object.keys(moodGroups).length > 0 ? (
            Object.entries(moodGroups).map(([date, entries]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry, idx) => {
                    const { time } = formatDate(entry.date);
                    const config = MOOD_CONFIG[entry.mood];
                    const id = `mood-${date}-${idx}`;
                    const isExpanded = expandedId === id;
                    return (
                      <div key={idx} className="glass rounded-3xl overflow-hidden relative group h-fit">
                        <div className="absolute right-4 top-5 flex items-center gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete("mood", entry.date);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="w-full p-5 flex items-center justify-between text-left pr-12"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", config.color.replace('text', 'bg').replace('500', '100'))}>
                              <config.icon className={config.color} size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{config.label}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                <Clock size={12} /> {time}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4"
                            >
                              {entry.note && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú cảm xúc</p>
                                  <p className="text-sm text-slate-600 leading-relaxed">{entry.note}</p>
                                </div>
                              )}
                              {entry.followUp && (
                                <div className="space-y-1 p-3 bg-sky-50 rounded-2xl border border-sky-100">
                                  <p className="text-[10px] font-bold text-sky-400 uppercase">Vấn đề phiền muộn</p>
                                  <p className="text-sm text-sky-700 leading-relaxed">{entry.followUp}</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có dữ liệu tâm lý</p>
            </div>
          )
        )}

        {activeTab === "sleep" && (
          Object.keys(sleepGroups).length > 0 ? (
            Object.entries(sleepGroups).map(([date, entries]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry, idx) => {
                    const { time } = formatDate(entry.date);
                    const id = `sleep-${date}-${idx}`;
                    const isExpanded = expandedId === id;
                    return (
                      <div key={idx} className="glass rounded-3xl overflow-hidden relative group h-fit">
                        <div className="absolute right-4 top-5 flex items-center gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete("sleep", entry.date);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="w-full p-5 flex items-center justify-between text-left pr-12"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                              entry.quality === 'good' ? "bg-emerald-100 text-emerald-600" :
                              entry.quality === 'normal' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                            )}>
                              <Moon size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{entry.hours} giờ ngủ</p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                <Clock size={12} /> {time}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Chất lượng</p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {entry.quality === 'good' ? 'Tốt' : entry.quality === 'normal' ? 'Bình thường' : 'Kém'}
                                  </p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Số giờ</p>
                                  <p className="text-sm font-bold text-slate-700">{entry.hours} giờ</p>
                                </div>
                              </div>
                              {entry.note && (
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú</p>
                                  <p className="text-xs text-slate-600 italic">"{entry.note}"</p>
                                </div>
                              )}
                              {entry.advice && (
                                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase">Lời khuyên AI</p>
                                  <p className="text-xs text-indigo-700 leading-relaxed whitespace-pre-wrap">{entry.advice}</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Moon size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có dữ liệu giấc ngủ</p>
            </div>
          )
        )}

        {activeTab === "nutrition" && (
          Object.keys(nutritionGroups).length > 0 ? (
            Object.entries(nutritionGroups).map(([date, entries]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry, idx) => {
                    const { time } = formatDate(entry.date);
                    const goalConfig = NUTRITION_GOALS[entry.goal];
                    const id = `nutrition-${date}-${idx}`;
                    const isExpanded = expandedId === id;
                    return (
                      <div key={idx} className="glass rounded-3xl overflow-hidden relative group h-fit">
                        <div className="absolute right-4 top-5 flex items-center gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete("nutrition", entry.date);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="w-full p-5 flex items-center justify-between text-left pr-12"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", goalConfig.color.replace('text', 'bg').replace('500', '100'))}>
                              <Utensils className={goalConfig.color} size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">Mục tiêu: {goalConfig.label}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                <Clock size={12} /> {time}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4"
                            >
                              <div className="bg-blue-50 p-3 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Droplets className="text-blue-500" size={18} />
                                  <p className="text-sm font-bold text-blue-700">Lượng nước uống</p>
                                </div>
                                <p className="text-lg font-black text-blue-600">{entry.waterIntake} ly</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Lời khuyên dinh dưỡng</p>
                                <div className="text-sm text-slate-600 leading-relaxed bg-white/50 p-3 rounded-2xl border border-slate-100">
                                  <Markdown>{entry.advice}</Markdown>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Utensils size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có dữ liệu dinh dưỡng</p>
            </div>
          )
        )}

        {activeTab === "workout" && (
          Object.keys(workoutGroups).length > 0 ? (
            Object.entries(workoutGroups).map(([date, entries]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry, idx) => {
                    const { time } = formatDate(entry.date);
                    const sport = SPORTS_CONFIG[entry.sportId];
                    const id = `workout-${date}-${idx}`;
                    const isExpanded = expandedId === id;
                    return (
                      <div key={idx} className="glass rounded-3xl overflow-hidden relative group h-fit">
                        <div className="absolute right-4 top-5 flex items-center gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete("workout", (entry as any).id || entry.date);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="w-full p-5 flex items-center justify-between text-left pr-12"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", sport?.bg || "bg-orange-100")}>
                              {sport ? <sport.icon className={sport.color} size={24} /> : <Dumbbell className="text-orange-500" size={24} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{entry.sportName}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                <Clock size={12} /> {time} • {entry.duration} phút
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</p>
                                  <p className="text-lg font-bold text-slate-700">{entry.duration} phút</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cường độ</p>
                                  <p className={cn("text-lg font-bold", 
                                    entry.intensity === 'low' ? "text-emerald-500" : 
                                    entry.intensity === 'moderate' ? "text-orange-500" : "text-rose-500"
                                  )}>
                                    {entry.intensity === 'low' ? "Nhẹ" : entry.intensity === 'moderate' ? "Vừa" : "Cao"}
                                  </p>
                                </div>
                              </div>
                              {entry.note && (
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú</p>
                                  <p className="text-sm text-slate-600 italic">"{entry.note}"</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Dumbbell size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có dữ liệu tập luyện</p>
            </div>
          )
        )}

        {activeTab === "gratitude" && (
          Object.keys(gratitudeGroups).length > 0 ? (
            Object.entries(gratitudeGroups).map(([date, entries]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{date}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry, idx) => {
                    const { time } = formatDate(entry.date);
                    const id = `gratitude-${date}-${idx}`;
                    const isExpanded = expandedId === id;
                    return (
                      <div key={idx} className="glass rounded-3xl overflow-hidden relative group h-fit">
                        <div className="absolute right-4 top-5 flex items-center gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete("gratitude", entry.date);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="w-full p-5 flex items-center justify-between text-left pr-12"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-pink-100 text-pink-500">
                              <Heart size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{entry.items.length} điều biết ơn</p>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                <Clock size={12} /> {time}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3"
                            >
                              <ul className="space-y-2">
                                {entry.items.map((item, j) => (
                                  <li key={j} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="text-pink-400 mt-1">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Heart size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Chưa có dữ liệu biết ơn</p>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}

// --- Sub-components ---

function VitalMindScreen({ 
  onBack, 
  moodHistory, 
  currentMood, 
  setCurrentMood, 
  moodNote, 
  setMoodNote, 
  saveMood,
  gratitudeEntries,
  setGratitudeEntries,
  aiAdvice,
  setAiAdvice,
  isAiLoading,
  handleGetAiAdvice,
  mentalIssue,
  setMentalIssue,
  followUpNote,
  setFollowUpNote,
  theme,
  showMoodHistory,
  setShowMoodHistory,
  addAiFeedbackToLocal,
  addGratitudeEntryToLocal,
  setSuccessMessage,
  onDeleteGratitude,
  onDeleteMood,
  sleepHistory,
  addSleepEntryToLocal,
  deleteSleepEntry,
  handleGetSleepAiAdvice,
  isSleepAiLoading,
  setIsSleepAiLoading,
  sleepAiAdvice,
  setSleepAiAdvice
}: {
  onBack: () => void;
  moodHistory: MoodEntry[];
  currentMood: Mood | null;
  setCurrentMood: (mood: Mood) => void;
  moodNote: string;
  setMoodNote: (note: string) => void;
  saveMood: () => void;
  gratitudeEntries: GratitudeEntry[];
  setGratitudeEntries: React.Dispatch<React.SetStateAction<GratitudeEntry[]>>;
  aiAdvice: string;
  setAiAdvice: (advice: string) => void;
  isAiLoading: boolean;
  handleGetAiAdvice: () => void;
  mentalIssue: string;
  setMentalIssue: (issue: string) => void;
  followUpNote: string;
  setFollowUpNote: (note: string) => void;
  theme: any;
  showMoodHistory: boolean;
  setShowMoodHistory: (show: boolean) => void;
  addAiFeedbackToLocal: (feedback: any) => void;
  addGratitudeEntryToLocal: (entry: GratitudeEntry) => void;
  setSuccessMessage: (msg: string | null) => void;
  onDeleteGratitude: (date: string) => void;
  onDeleteMood: (date: string) => void;
  sleepHistory: SleepEntry[];
  addSleepEntryToLocal: (entry: SleepEntry) => void;
  deleteSleepEntry: (date: string) => void;
  handleGetSleepAiAdvice: (hours: number, quality: string, note: string) => void;
  isSleepAiLoading: boolean;
  setIsSleepAiLoading: (loading: boolean) => void;
  sleepAiAdvice: string;
  setSleepAiAdvice: (advice: string) => void;
}) {
  const sortedMoodHistory = [...moodHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedGratitudeEntries = [...gratitudeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedSleepHistory = [...sleepHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [activeTab, setActiveTab] = useState<"mood" | "sleep" | "gratitude">("mood");
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [gratitudeInputs, setGratitudeInputs] = useState(["", "", ""]);
  const [showGratitudeSuccess, setShowGratitudeSuccess] = useState(false);

  // Sleep state
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState<"good" | "normal" | "poor">("normal");
  const [sleepNote, setSleepNote] = useState("");
  const [showSleepHistory, setShowSleepHistory] = useState(false);

  const [feedback, setFeedback] = useState<'none' | 'yes' | 'no'>('none');
  const [feedbackNote, setFeedbackNote] = useState("");

  useEffect(() => {
    if (isAiLoading) {
      setFeedback('none');
    }
  }, [isAiLoading]);

  const saveFeedback = async (status: 'yes' | 'no') => {
    setFeedback(status);
    const feedback = {
      date: new Date().toISOString(),
      issue: mentalIssue,
      advice: aiAdvice,
      helpful: status === 'yes',
      note: feedbackNote
    };
    addAiFeedbackToLocal(feedback);
    setSuccessMessage("Cảm ơn bạn đã gửi phản hồi!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const saveGratitude = async () => {
    const now = new Date().toISOString();
    const newEntry: GratitudeEntry = {
      date: now,
      items: gratitudeInputs.filter(i => i.trim() !== "")
    };
    if (newEntry.items.length > 0) {
      addGratitudeEntryToLocal(newEntry);
      setGratitudeInputs(["", "", ""]);
      setShowGratitudeSuccess(true);
      setTimeout(() => setShowGratitudeSuccess(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-24"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2">
            <ArrowLeft size={24} />
          </button>
          <h2 className={cn("text-2xl font-bold", theme.text900)}>Tâm lý Học đường</h2>
        </div>
        <button 
          onClick={() => setShowMoodHistory(!showMoodHistory)}
          className={cn(
            "p-2 rounded-xl flex items-center gap-1 text-sm font-bold transition-all",
            showMoodHistory ? cn(theme.bg600, "text-white") : cn(theme.bg100, theme.text600)
          )}
        >
          <History size={18} /> {showMoodHistory ? "Đóng lịch sử" : "Lịch sử"}
        </button>
      </div>

      {!showMoodHistory ? (
        <>
          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
            {[
              { id: "mood", label: "Tâm trạng", icon: Smile },
              { id: "sleep", label: "Giấc ngủ", icon: Moon },
              { id: "gratitude", label: "Biết ơn", icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                  activeTab === tab.id 
                    ? cn(theme.bg600, "text-white shadow-md") 
                    : cn(theme.bg100, theme.text600)
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "mood" && (
              <motion.div
                key="mood"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <div className="space-y-6">
                  <div className={cn("glass p-6 rounded-3xl space-y-4", theme.bg100_50)}>
                    <h3 className={cn("font-bold", theme.text800)}>Hôm nay bạn thấy thế nào?</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.entries(MOOD_CONFIG) as [Mood, typeof MOOD_CONFIG['happy']][]).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => setCurrentMood(key)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2",
                            currentMood === key 
                              ? cn("bg-white shadow-md scale-105", theme.border400) 
                              : "bg-white/30 border-transparent opacity-70"
                          )}
                        >
                          <config.icon className={cn("w-8 h-8", config.color)} />
                          <span className="text-xs font-bold text-slate-700">{config.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className={cn("text-sm font-medium", theme.text800)}>Ghi chú thêm (tùy chọn)</p>
                      <textarea
                        value={moodNote}
                        onChange={(e) => setMoodNote(e.target.value)}
                        placeholder="Hãy chia sẻ cảm xúc của bạn..."
                        className={cn("w-full bg-white/50 border-none rounded-2xl p-4 text-sm outline-none min-h-[100px]", theme.ring400)}
                      />
                      <button
                        onClick={saveMood}
                        disabled={!currentMood}
                        className={cn("w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50", theme.bg500, `hover:${theme.bg600}`)}
                      >
                        Lưu cảm xúc
                      </button>
                    </div>
                  </div>

                  {/* Mood Insights */}
                  <div className={cn("glass p-6 rounded-3xl space-y-4", theme.bg100)}>
                    <h3 className={cn("font-bold", theme.text800)}>Phân tích tâm lý</h3>
                    <div className="p-4 bg-white/50 rounded-2xl border border-white/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-sky-100 rounded-lg text-sky-600">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Thông tin thú vị</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {moodHistory.length > 3 
                              ? "Dựa trên dữ liệu, bạn thường cảm thấy hạnh phúc hơn vào những ngày có hoạt động thể chất trên 30 phút."
                              : "Hãy tiếp tục ghi lại cảm xúc để TeenCare giúp bạn tìm ra mối liên hệ giữa sức khỏe và tâm trạng nhé!"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Soulmate Section */}
                <div className={cn("glass p-6 rounded-3xl space-y-4 h-fit", theme.bg100_50)}>
                  <div className="flex items-center gap-2">
                    <Sparkles className={theme.text500} size={20} />
                    <h3 className={cn("font-bold", theme.text800)}>AI Soulmate</h3>
                  </div>
                  <p className="text-xs text-slate-500">Người bạn luôn lắng nghe và thấu hiểu bạn 24/7.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className={cn("text-sm font-medium", theme.text800)}>Tâm sự với AI</p>
                      <textarea
                        value={mentalIssue}
                        onChange={(e) => setMentalIssue(e.target.value)}
                        placeholder="Ví dụ: Mình đang thấy áp lực vì kỳ thi sắp tới..."
                        className={cn("w-full bg-white/50 border-none rounded-2xl p-4 text-sm outline-none min-h-[80px]", theme.ring400)}
                      />
                    </div>
                    <button
                      onClick={handleGetAiAdvice}
                      disabled={isAiLoading || !mentalIssue.trim()}
                      className={cn("w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2", theme.bg500)}
                    >
                      {isAiLoading ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                      {isAiLoading ? "Đang suy nghĩ..." : "Tâm sự với AI"}
                    </button>

                    <AnimatePresence>
                      {aiAdvice && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center gap-2 px-2">
                            <Sparkles className="text-amber-500" size={18} />
                            <h3 className={cn("font-bold text-sm", theme.text800)}>Lời khuyên AI</h3>
                          </div>
                          <div className="p-4 bg-white/80 rounded-2xl border border-white/50 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg shrink-0", theme.bg100)}>
                                <Sparkles size={16} className={theme.text600} />
                              </div>
                              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {aiAdvice}
                              </div>
                            </div>
                          </div>

                          {/* Feedback Mechanism */}
                          {feedback === 'none' && (
                            <div className="flex flex-col items-center gap-3 py-2">
                              <p className="text-xs font-bold text-slate-500">Lời khuyên này có giúp ích cho bạn không?</p>
                              <div className="flex gap-4">
                                <button 
                                  onClick={() => saveFeedback('yes')}
                                  className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-md hover:bg-emerald-600 transition-all"
                                >
                                  Có
                                </button>
                                <button 
                                  onClick={() => saveFeedback('no')}
                                  className="flex items-center gap-2 px-6 py-2 bg-rose-500 text-white rounded-full text-xs font-bold shadow-md hover:bg-rose-600 transition-all"
                                >
                                  Không
                                </button>
                              </div>
                            </div>
                          )}

                          {feedback === 'yes' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center"
                            >
                              <p className="text-sm font-bold text-emerald-700">Cảm ơn bạn! Mình rất vui vì đã giúp được bạn. Hãy luôn lạc quan nhé! ❤️</p>
                            </motion.div>
                          )}

                          {feedback === 'no' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3"
                            >
                              <p className="text-sm font-bold text-rose-700 text-center">Mình xin lỗi vì chưa giúp được bạn tốt nhất. Bạn có thể thử chia sẻ chi tiết hơn để mình thấu hiểu nhé.</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setFeedback('none');
                                    setAiAdvice("");
                                  }}
                                  className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-bold"
                                >
                                  Tâm sự lại
                                </button>
                                <button 
                                  onClick={() => setFeedback('none')}
                                  className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold"
                                >
                                  Để sau
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "sleep" && (
              <motion.div
                key="sleep"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Sleep Input Form */}
                <div className={cn("glass p-6 rounded-3xl space-y-6 h-fit", theme.bg100_50)}>
                  <div className="flex items-center gap-2">
                    <Moon className="text-indigo-500" size={20} />
                    <h3 className={cn("font-bold", theme.text800)}>Theo dõi giấc ngủ</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-slate-700">Số giờ ngủ</p>
                        <span className={cn("text-lg font-bold", theme.text600)}>{sleepHours} giờ</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="14"
                        step="0.5"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                        className={cn("w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500")}
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>1h</span>
                        <span>7-9h (Lý tưởng)</span>
                        <span>14h</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Chất lượng giấc ngủ</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "good", label: "Tốt", color: "text-emerald-500", bg: "bg-emerald-50" },
                          { id: "normal", label: "Bình thường", color: "text-amber-500", bg: "bg-amber-50" },
                          { id: "poor", label: "Kém", color: "text-rose-500", bg: "bg-rose-50" },
                        ].map((q) => (
                          <button
                            key={q.id}
                            onClick={() => setSleepQuality(q.id as any)}
                            className={cn(
                              "py-2 rounded-xl text-xs font-bold transition-all border-2",
                              sleepQuality === q.id 
                                ? cn(q.bg, q.color, "border-indigo-400 shadow-sm") 
                                : "bg-white/50 border-transparent text-slate-400"
                            )}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Ghi chú thêm</p>
                      <textarea
                        value={sleepNote}
                        onChange={(e) => setSleepNote(e.target.value)}
                        placeholder="Ví dụ: Ác mộng, khó ngủ, hay tỉnh giấc..."
                        className="w-full bg-white/50 border-none rounded-2xl p-4 text-sm outline-none min-h-[80px] focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleGetSleepAiAdvice(sleepHours, sleepQuality, sleepNote)}
                        disabled={isSleepAiLoading}
                        className={cn("flex-1 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-indigo-50 disabled:opacity-50")}
                      >
                        {isSleepAiLoading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        AI Phân tích
                      </button>
                      <button
                        onClick={() => {
                          const entry: SleepEntry = {
                            date: new Date().toISOString(),
                            hours: sleepHours,
                            quality: sleepQuality,
                            note: sleepNote,
                            advice: sleepAiAdvice
                          };
                          addSleepEntryToLocal(entry);
                          setSleepNote("");
                          setSleepAiAdvice("");
                          setSuccessMessage("Đã lưu nhật ký giấc ngủ!");
                          setTimeout(() => setSuccessMessage(null), 3000);
                        }}
                        className={cn("flex-1 py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all", theme.bg500)}
                      >
                        Lưu nhật ký
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Sleep Advice Display */}
                <AnimatePresence>
                  {sleepAiAdvice && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("glass p-6 rounded-3xl space-y-3 border-2 border-indigo-100 h-fit", theme.bg100_50)}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-amber-500" size={18} />
                        <h4 className="font-bold text-sm text-slate-800">Lời khuyên từ TeenCare</h4>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {sleepAiAdvice}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sleep Chart */}
                {sortedSleepHistory.length > 1 && (
                  <div className={cn("glass p-6 rounded-3xl space-y-4", theme.bg100)}>
                    <h3 className={cn("font-bold", theme.text800)}>Biểu đồ giấc ngủ tuần này</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sortedSleepHistory.slice(0, 7).reverse().map(h => ({
                          date: new Date(h.date).toLocaleDateString('vi-VN', { weekday: 'short' }),
                          hours: h.hours
                        }))}>
                          <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 12]} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Sleep History List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className={cn("font-bold", theme.text800)}>Lịch sử giấc ngủ</h3>
                    {sortedSleepHistory.length > 3 && (
                      <button 
                        onClick={() => setShowSleepHistory(!showSleepHistory)}
                        className={cn("text-xs font-bold flex items-center gap-1", theme.text600)}
                      >
                        {showSleepHistory ? "Thu gọn" : "Xem tất cả"}
                        <ChevronRight size={14} className={cn("transition-transform", showSleepHistory ? "rotate-90" : "")} />
                      </button>
                    )}
                  </div>

                  {sortedSleepHistory.length > 0 ? (
                    <div className={cn(
                      "grid gap-3",
                      showSleepHistory ? "overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" : ""
                    )}>
                      {(showSleepHistory ? sortedSleepHistory : sortedSleepHistory.slice(0, 3)).map((entry, i) => (
                        <div key={i} className="glass bg-white/60 p-4 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                entry.quality === 'good' ? "bg-emerald-100 text-emerald-600" :
                                entry.quality === 'normal' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                              )}>
                                <Moon size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{entry.hours} giờ ngủ</p>
                                <p className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString('vi-VN')}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteSleepEntry(entry.date)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {entry.note && (
                            <p className="text-[10px] text-slate-600 italic border-l-2 border-slate-200 pl-2">
                              "{entry.note}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-8 text-sm italic">Chưa có dữ liệu giấc ngủ.</p>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "gratitude" && (
              <motion.div
                key="gratitude"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <div className={cn("glass p-6 rounded-3xl space-y-4 relative overflow-hidden h-fit", theme.bg100_50)}>
                  <AnimatePresence>
                    {showGratitudeSuccess && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
                      >
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 10, 0],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <Heart className="text-pink-500 w-16 h-16 fill-pink-500" />
                        </motion.div>
                        <p className={cn("mt-4 font-bold text-lg", theme.text700)}>Thật tuyệt vời!</p>
                        <p className="text-sm text-slate-500">Lòng biết ơn giúp cuộc sống ý nghĩa hơn.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2">
                    <Heart className="text-pink-500" size={20} />
                    <h3 className={cn("font-bold", theme.text800)}>3 điều biết ơn hôm nay</h3>
                  </div>
                  <p className="text-xs text-slate-500 italic">Viết ra những điều nhỏ bé khiến bạn mỉm cười...</p>
                  
                  <div className="space-y-3">
                    {gratitudeInputs.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", theme.bg400)}>
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            const newInputs = [...gratitudeInputs];
                            newInputs[idx] = e.target.value;
                            setGratitudeInputs(newInputs);
                          }}
                          placeholder="Điều gì đó tốt đẹp..."
                          className="flex-1 bg-white/50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={saveGratitude}
                    disabled={gratitudeInputs.every(i => i.trim() === "")}
                    className={cn("w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50", theme.bg500)}
                  >
                    Lưu nhật ký
                  </button>
                </div>

                {/* Gratitude History Section */}
                <div className="space-y-4 h-fit">
                  <div className="flex items-center justify-between px-2">
                    <h3 className={cn("font-bold", theme.text800)}>Nhật ký cũ</h3>
                  </div>

                  {sortedGratitudeEntries.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {sortedGratitudeEntries.map((entry, i) => (
                        <motion.div 
                          key={i} 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass bg-white/60 p-4 rounded-2xl space-y-2 w-full"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400">
                              {new Date(entry.date).toLocaleDateString('vi-VN', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteGratitude(entry.date);
                                }}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                              <Heart size={12} className="text-pink-400" />
                            </div>
                          </div>
                          <ul className="space-y-1">
                            {entry.items.map((item, j) => (
                              <li key={j} className="text-xs text-slate-700 flex items-start gap-2">
                                <span className="text-pink-400 mt-1">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-8 text-sm italic">Hãy bắt đầu viết điều đầu tiên!</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="space-y-6">
          <div className={cn("glass p-6 rounded-3xl space-y-4", theme.bg100)}>
            <h3 className={cn("font-bold flex items-center gap-2", theme.text800)}>
              <Calendar size={20} /> Lịch sử tâm trạng
            </h3>
            
            {sortedMoodHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Chưa có lịch sử tâm trạng.</p>
            ) : (
              <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {(Array.from(new Set(sortedMoodHistory.map(h => h.date.substring(0, 7)))) as string[]).map(month => (
                  <div key={month} className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                      Tháng {new Date(month + "-01").getMonth() + 1}, {new Date(month + "-01").getFullYear()}
                    </h4>
                    <div className="grid gap-3">
                      {sortedMoodHistory.filter(h => h.date.startsWith(month)).map((entry, i) => (
                        <div key={i} className="bg-white/60 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100", MOOD_CONFIG[entry.mood].color)}>
                                {React.createElement(MOOD_CONFIG[entry.mood].icon, { size: 18 })}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{MOOD_CONFIG[entry.mood].label}</p>
                                <p className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString('vi-VN')}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => onDeleteMood(entry.date)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {entry.note && (
                            <p className="text-[10px] text-slate-600 italic border-l-2 border-slate-200 pl-2">
                              "{entry.note}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

      </div>
      )}
    </motion.div>
  );
}

// --- Main App Component ---

export default function App() {
  const [step, setStep] = useState<AppStep>("loading");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Profile State
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>({
    school: "",
    role: "student",
    className: "",
  });
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    gender: "male",
    age: 0,
    height: 0,
    weight: 0,
    activity: "moderate",
    moodHistory: [],
    gratitudeJournal: [],
    sleepHistory: [],
    challenges: [
      { id: "c1", title: "Thử thách 5.000 bước", description: "Đi bộ ít nhất 5.000 bước mỗi ngày.", target: 5000, current: 0, unit: "bước", deadline: new Date().toISOString(), completed: false, type: "daily" },
      { id: "c2", title: "Chiến binh Cầu lông", description: "Tập luyện cầu lông 3 buổi trong tuần.", target: 3, current: 0, unit: "buổi", deadline: new Date().toISOString(), completed: false, type: "weekly" },
    ],
    school: "",
    className: "",
  });

  // BMI History State
  const [bmiHistory, setBmiHistory] = useState<BMIEntry[]>([]);

  // Mental Health State
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [sleepHistory, setSleepHistory] = useState<SleepEntry[]>([]);
  const [mentalIssue, setMentalIssue] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSleepAiLoading, setIsSleepAiLoading] = useState(false);
  const [sleepAiAdvice, setSleepAiAdvice] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showMoodHistory, setShowMoodHistory] = useState(false);

  // Nutrition State
  const [nutritionHistory, setNutritionHistory] = useState<NutritionEntry[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutEntry[]>([]);
  const [aiFeedback, setAiFeedback] = useState<any[]>([]);
  const [currentNutritionGoal, setCurrentNutritionGoal] = useState<NutritionGoal>("maintenance");
  const [waterIntake, setWaterIntake] = useState(0);
  const [nutritionAdvice, setNutritionAdvice] = useState("");
  const [isNutritionLoading, setIsNutritionLoading] = useState(false);
  const [showNutritionHistory, setShowNutritionHistory] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<ThemeConfig>({
    color: "sky",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isProfileSetup, setIsProfileSetup] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const mainTheme = useMemo(() => getThemeClasses(theme.color), [theme.color]);
  const mentalTheme = mainTheme;
  const nutritionTheme = mainTheme;
  const exerciseTheme = mainTheme;

  // Local Storage Keys
  const STORAGE_KEYS = {
    PROFILE: 'teencare_profile',
    SCHOOL_PROFILE: 'teencare_school_profile',
    BMI_HISTORY: 'teencare_bmi_history',
    MOOD_HISTORY: 'teencare_mood_history',
    NUTRITION_HISTORY: 'teencare_nutrition_history',
    GRATITUDE_JOURNAL: 'teencare_gratitude_journal',
    WORKOUT_HISTORY: 'teencare_workout_history',
    THEME: 'teencare_theme',
    AI_FEEDBACK: 'teencare_ai_feedback',
    SLEEP_HISTORY: 'teencare_sleep_history',
  };

  // Auth & Data Initialization
  useEffect(() => {
    const loadData = () => {
      try {
        const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        const savedSchoolProfile = localStorage.getItem(STORAGE_KEYS.SCHOOL_PROFILE);
        const savedBmiHistory = localStorage.getItem(STORAGE_KEYS.BMI_HISTORY);
        const savedMoodHistory = localStorage.getItem(STORAGE_KEYS.MOOD_HISTORY);
        const savedNutritionHistory = localStorage.getItem(STORAGE_KEYS.NUTRITION_HISTORY);
        const savedGratitudeJournal = localStorage.getItem(STORAGE_KEYS.GRATITUDE_JOURNAL);
        const savedWorkoutHistory = localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY);
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const savedAiFeedback = localStorage.getItem(STORAGE_KEYS.AI_FEEDBACK);
        const savedSleepHistory = localStorage.getItem(STORAGE_KEYS.SLEEP_HISTORY);

        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          setProfile(prev => ({ ...prev, ...profileData }));
          setIsProfileSetup(true);
        }
        if (savedSchoolProfile) setSchoolProfile(JSON.parse(savedSchoolProfile));
        if (savedBmiHistory) setBmiHistory(JSON.parse(savedBmiHistory));
        if (savedMoodHistory) setMoodHistory(JSON.parse(savedMoodHistory));
        if (savedNutritionHistory) setNutritionHistory(JSON.parse(savedNutritionHistory));
        if (savedGratitudeJournal) setGratitudeEntries(JSON.parse(savedGratitudeJournal));
        if (savedWorkoutHistory) setWorkoutHistory(JSON.parse(savedWorkoutHistory));
        if (savedAiFeedback) setAiFeedback(JSON.parse(savedAiFeedback));
        if (savedSleepHistory) setSleepHistory(JSON.parse(savedSleepHistory));
        if (savedTheme) setTheme(JSON.parse(savedTheme));

        setIsAuthReady(true);
      } catch (error) {
        console.error("Error loading data from localStorage:", error);
        setIsAuthReady(true);
      }
    };

    loadData();
  }, []);

  // Persistence Helpers
  const saveProfileToLocal = (newProfile: UserProfile, newSchoolProfile: SchoolProfile) => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    localStorage.setItem(STORAGE_KEYS.SCHOOL_PROFILE, JSON.stringify(newSchoolProfile));
    setProfile(newProfile);
    setSchoolProfile(newSchoolProfile);
    setIsProfileSetup(true);
  };

  const addBmiEntryToLocal = (entry: BMIEntry) => {
    const newHistory = [entry, ...bmiHistory];
    setBmiHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.BMI_HISTORY, JSON.stringify(newHistory));
  };

  const deleteBmiEntry = (date: string) => {
    const newHistory = bmiHistory.filter(h => h.date !== date);
    setBmiHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.BMI_HISTORY, JSON.stringify(newHistory));
  };

  const addMoodEntryToLocal = (entry: MoodEntry) => {
    const newHistory = [entry, ...moodHistory];
    setMoodHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.MOOD_HISTORY, JSON.stringify(newHistory));
  };

  const deleteMoodEntry = (date: string) => {
    const newHistory = moodHistory.filter(h => h.date !== date);
    setMoodHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.MOOD_HISTORY, JSON.stringify(newHistory));
  };

  const addNutritionEntryToLocal = (entry: NutritionEntry) => {
    const newHistory = [entry, ...nutritionHistory];
    setNutritionHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.NUTRITION_HISTORY, JSON.stringify(newHistory));
  };

  const deleteNutritionEntry = (date: string) => {
    const newHistory = nutritionHistory.filter(h => h.date !== date);
    setNutritionHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.NUTRITION_HISTORY, JSON.stringify(newHistory));
  };

  const addGratitudeEntryToLocal = (entry: GratitudeEntry) => {
    const newEntries = [entry, ...gratitudeEntries];
    setGratitudeEntries(newEntries);
    localStorage.setItem(STORAGE_KEYS.GRATITUDE_JOURNAL, JSON.stringify(newEntries));
  };

  const deleteGratitudeEntry = (date: string) => {
    const newEntries = gratitudeEntries.filter(e => e.date !== date);
    setGratitudeEntries(newEntries);
    localStorage.setItem(STORAGE_KEYS.GRATITUDE_JOURNAL, JSON.stringify(newEntries));
  };

  const addAiFeedbackToLocal = (feedback: any) => {
    const newFeedback = [feedback, ...aiFeedback];
    setAiFeedback(newFeedback);
    localStorage.setItem(STORAGE_KEYS.AI_FEEDBACK, JSON.stringify(newFeedback));
  };

  const addWorkoutEntryToLocal = (entry: WorkoutEntry) => {
    const id = Date.now().toString();
    const newEntry = { ...entry, id };
    const newHistory = [newEntry, ...workoutHistory];
    setWorkoutHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(newHistory));
    setSuccessMessage("Đã lưu buổi tập luyện!");
  };

  const addSleepEntryToLocal = (entry: SleepEntry) => {
    const newHistory = [entry, ...sleepHistory];
    setSleepHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.SLEEP_HISTORY, JSON.stringify(newHistory));
  };

  const deleteSleepEntry = (date: string) => {
    const newHistory = sleepHistory.filter(h => h.date !== date);
    setSleepHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.SLEEP_HISTORY, JSON.stringify(newHistory));
  };

  const deleteWorkoutEntry = (id: string) => {
    const newHistory = workoutHistory.filter(h => (h as any).id !== id && h.date !== id);
    setWorkoutHistory(newHistory);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(newHistory));
  };

  const updateThemeInLocal = (newColor: string) => {
    const newTheme = { color: newColor };
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(newTheme));
  };

  // Handle splash screen transition
  useEffect(() => {
    if (step === "loading" && isAuthReady) {
      const timer = setTimeout(() => {
        if (isProfileSetup) {
          setStep("dashboard");
        } else {
          setStep("profile_setup");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, isAuthReady, isProfileSetup]);

  // Splash Screen Logic (Quotes only)
  useEffect(() => {
    if (step === "loading") {
      const quoteInterval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % POSITIVE_QUOTES.length);
      }, 1500);

      return () => {
        clearInterval(quoteInterval);
      };
    }

    if (step === "loading_after_setup") {
      const quoteInterval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % POSITIVE_QUOTES.length);
      }, 1500);

      const timer = setTimeout(() => {
        setStep("dashboard");
        clearInterval(quoteInterval);
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearInterval(quoteInterval);
      };
    }
  }, [step]);

  const bmiResult = useMemo((): BMIResult | null => {
    if (step !== "result") return null;

    if (profile.height === 0 || profile.weight === 0) {
      return {
        score: 0,
        category: "normal",
        label: "Chưa có dữ liệu",
        color: "text-slate-400",
        description: "Vui lòng nhập chiều cao và cân nặng để tính BMI.",
        nutrition: [],
        exercise: []
      };
    }

    const heightInMeters = profile.height / 100;
    const score = profile.weight / (heightInMeters * heightInMeters);
    
    let category: BMIResult["category"] = "normal";
    let label = "Bình thường";
    let color = "text-green-500";
    let description = "Bạn có một cơ thể cân đối. Hãy duy trì lối sống lành mạnh này nhé!";
    let nutrition = [
      "Ăn uống đa dạng: Cơm, món mặn (cá/thịt), món xào và canh.",
      "Tăng cường rau xanh vườn nhà: Rau muống, rau ngót, cải ngọt...",
      "Uống đủ 2-2.5 lít nước (khoảng 8-10 ly mỗi ngày)."
    ];
    let exercise = [
      "Kết hợp Cardio (chạy bộ, đạp xe) và tập cơ (Plank, Squat).",
      "Duy trì ít nhất 150 phút vận động mỗi tuần.",
      "Tập luyện đều đặn 3-5 buổi/tuần."
    ];

    if (score < 18.5) {
      category = "underweight";
      label = "Thiếu cân";
      color = "text-blue-500";
      description = "Bạn đang hơi gầy một chút. Cần bổ sung thêm dinh dưỡng để cơ thể khỏe mạnh hơn.";
      nutrition = [
        "Ăn đủ 3 bữa chính, thêm bữa phụ với khoai lang, bắp luộc hoặc sữa.",
        "Tăng đạm từ thực phẩm gần gũi: Trứng, đậu phụ, cá đồng, thịt lợn nạc.",
        "Bổ sung chất béo tốt từ lạc (đậu phộng), vừng (mè)."
      ];
      exercise = [
        "Tập trung vào kháng lực (Gym, Thể thao nâng cao) để xây dựng cơ bắp.",
        "Hạn chế Cardio quá nặng gây đốt cháy quá nhiều calo.",
        "Ngủ đủ giấc để cơ thể phục hồi và phát triển."
      ];
    } else if (score >= 23 && score < 25) {
      category = "overweight";
      label = "Thừa cân";
      color = "text-yellow-500";
      description = "Bạn đang ở ngưỡng thừa cân. Một chút điều chỉnh trong ăn uống sẽ giúp bạn lấy lại vóc dáng.";
      nutrition = [
        "Giảm bớt lượng cơm trong mỗi bữa, tăng lượng rau luộc.",
        "Hạn chế đồ chiên rán nhiều dầu mỡ, đồ ngọt, nước có ga.",
        "Ưu tiên các món hấp, luộc, kho nhạt thay vì chiên xào."
      ];
      exercise = [
        "Cardio cường độ vừa (Đi bộ nhanh, bơi lội) để đốt mỡ.",
        "Tăng dần cường độ tập luyện khi cơ thể đã quen.",
        "Theo dõi lượng calo nạp vào hàng ngày."
      ];
    } else if (score >= 25) {
      category = "obese";
      label = "Béo phì";
      color = "text-red-500";
      description = "Chỉ số BMI cho thấy bạn đang béo phì. Hãy bắt đầu lộ trình giảm cân ngay để bảo vệ sức khỏe tim mạch.";
      nutrition = [
        "Kiểm soát chặt chẽ lượng cơm, thay bằng khoai, sắn nếu cần.",
        "Ăn nhiều rau xanh, đặc biệt là các loại rau lá đậm.",
        "Tuyệt đối tránh ăn đêm và các loại bánh kẹo, trà sữa."
      ];
      exercise = [
        "Bắt đầu với các bài tập nhẹ nhàng để bảo vệ khớp.",
        "Duy trì vận động hàng ngày, dù chỉ là đi bộ ngắn.",
        "Tham khảo ý kiến chuyên gia để có lộ trình an toàn."
      ];
    }

    return { score, category, label, color, description, nutrition, exercise };
  }, [profile, step]);

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Profile Sheet
      const profileData = [{
        "Họ và tên": profile.name,
        "Email": profile.email,
        "Giới tính": profile.gender === "male" ? "Nam" : "Nữ",
        "Tuổi": profile.age,
        "Chiều cao (cm)": profile.height,
        "Cân nặng (kg)": profile.weight,
        "Mức độ vận động": profile.activity,
        "Trường": schoolProfile.school,
        "Vai trò": schoolProfile.role,
        "Khối": schoolProfile.grade,
        "Lớp": schoolProfile.className
      }];
      const wsProfile = XLSX.utils.json_to_sheet(profileData);
      XLSX.utils.book_append_sheet(wb, wsProfile, "Hồ sơ");

      // 2. BMI History
      const bmiData = bmiHistory.map(entry => ({
        "Ngày": new Date(entry.date).toLocaleString('vi-VN'),
        "Cân nặng (kg)": entry.weight,
        "Chiều cao (cm)": entry.height,
        "Chỉ số BMI": entry.score.toFixed(1),
        "Phân loại": entry.label
      }));
      const wsBMI = XLSX.utils.json_to_sheet(bmiData);
      XLSX.utils.book_append_sheet(wb, wsBMI, "Lịch sử BMI");

      // 3. Mood History
      const moodData = moodHistory.map(entry => ({
        "Ngày": new Date(entry.date).toLocaleString('vi-VN'),
        "Tâm trạng": MOOD_CONFIG[entry.mood].label,
        "Ghi chú": entry.note || ""
      }));
      const wsMood = XLSX.utils.json_to_sheet(moodData);
      XLSX.utils.book_append_sheet(wb, wsMood, "Tâm lý");

      // 4. Nutrition History
      const nutritionData = nutritionHistory.map(entry => ({
        "Ngày": new Date(entry.date).toLocaleString('vi-VN'),
        "Mục tiêu": NUTRITION_GOALS[entry.goal].label,
        "Lời khuyên": entry.advice || ""
      }));
      const wsNutrition = XLSX.utils.json_to_sheet(nutritionData);
      XLSX.utils.book_append_sheet(wb, wsNutrition, "Dinh dưỡng");

      // 5. Workout History
      const workoutData = workoutHistory.map(entry => ({
        "Ngày": new Date(entry.date).toLocaleString('vi-VN'),
        "Môn thể thao": entry.sportName,
        "Thời gian (phút)": entry.duration,
        "Cường độ": entry.intensity,
        "Ghi chú": entry.note || ""
      }));
      const wsWorkout = XLSX.utils.json_to_sheet(workoutData);
      XLSX.utils.book_append_sheet(wb, wsWorkout, "Tập luyện");

      // 6. Gratitude Journal
      const gratitudeData = gratitudeEntries.map(entry => ({
        "Ngày": new Date(entry.date).toLocaleString('vi-VN'),
        "Nội dung": entry.items.join(", ")
      }));
      const wsGratitude = XLSX.utils.json_to_sheet(gratitudeData);
      XLSX.utils.book_append_sheet(wb, wsGratitude, "Nhật ký biết ơn");

      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `TeenCare_Data_${profile.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setSuccessMessage("Đã xuất file Excel thành công!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Excel export failed:", error);
      // Fallback for iframe restrictions if needed
    }
  };
  const saveBMI = () => {
    if (!bmiResult) return;
    const newEntry: BMIEntry = {
      date: new Date().toISOString(),
      weight: profile.weight,
      height: profile.height,
      score: bmiResult.score,
      category: bmiResult.category,
      label: bmiResult.label,
      color: bmiResult.color,
    };
    addBmiEntryToLocal(newEntry);
    // Also update main profile to persist height/weight
    saveProfileToLocal(profile, schoolProfile);
    setSuccessMessage("Cập nhật chỉ số BMI thành công!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const saveMood = () => {
    if (!currentMood) return;
    const newEntry: MoodEntry = {
      date: new Date().toISOString(),
      mood: currentMood,
      note: moodNote,
    };
    const followUpText = `${mentalIssue} ${followUpNote}`.trim();
    if (followUpText) {
      newEntry.followUp = followUpText;
    }
    addMoodEntryToLocal(newEntry);

    // Reset inputs after saving
    setMoodNote("");
    setMentalIssue("");
    setFollowUpNote("");
    setSuccessMessage("Đã lưu cảm xúc của bạn thành công!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleGetAiAdvice = async () => {
    if (!mentalIssue.trim()) return;
    setIsAiLoading(true);
    setAiAdvice("");

    // Artificial delay of 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const model = "gemini-3-flash-preview";
      const userRole = 'Học sinh';
      const prompt = `Bạn là "TeenCare Soulmate", một chuyên gia tư vấn tâm lý học đường thấu hiểu, ấm áp và chân thành.
      
      Thông tin người dùng:
      - Tên: ${profile.name}
      - Vai trò: ${userRole}
      - Tâm trạng hiện tại: ${currentMood ? MOOD_CONFIG[currentMood].label : 'Chưa xác định'}
      - Ghi chú cảm xúc: "${moodNote}"
      - Vấn đề đang gặp phải: "${mentalIssue}"
      - Chia sẻ thêm: "${followUpNote}"
      - BMI hiện tại: ${bmiResult ? `${bmiResult.score.toFixed(1)} (${bmiResult.label})` : 'Chưa có dữ liệu'}
      
      Nhiệm vụ của bạn:
      1. Chào người dùng bằng tên, giới thiệu bản thân là TeenCare Soulmate và thể hiện sự thông cảm sâu sắc với vấn đề họ đang gặp phải. Sử dụng từ ngữ xưng hô phù hợp với vai trò là ${userRole}.
      
      2. Áp dụng quy trình tư vấn chuyên nghiệp sau đây để đưa ra lời khuyên:
         - Thiết lập quan hệ: Gợi ý cách kết nối, tìm hiểu thêm thông tin qua các kênh như gia đình, đồng nghiệp/giáo viên chủ nhiệm, hoặc bạn bè xung quanh.
         - Đánh giá: Đưa ra nhận định khách quan về mức độ của vấn đề (ví dụ: đang ở mức khổ tâm hay nhiễu tâm).
         - Tìm hiểu và lựa chọn giải pháp: Đề xuất các hướng giải quyết cụ thể cho vấn đề của họ.
         - Thực hiện:
            + Nếu vấn đề liên quan đến hành vi sai lệch (như bắt nạt hoặc bị bắt nạt): Phân tích rõ đó là hành vi chưa đúng, cần hướng tới những giá trị tốt đẹp, giúp đỡ người yếu thế hơn.
            + Tuyên dương và động viên những nỗ lực hoặc điểm tích cực của họ trong cuộc sống/học tập.
         - Kết thúc: Đưa ra lời hứa hẹn đồng hành và động viên để họ có thêm động lực.
         - Xác định kết quả: Giúp họ nhận biết các dấu hiệu bất thường về hành vi/tâm lý của bản thân để tự theo dõi.
         - Đánh giá nhân tố tác động: Phân tích sơ bộ các yếu tố đang tác động đến họ để có hướng giải quyết đúng đắn.

      3. Nếu phát hiện dấu hiệu nguy hiểm (tự hại, bạo lực):
         - Lập tức phát cảnh báo nghiêm túc nhưng vẫn giữ sự quan tâm.
         - Yêu cầu họ gặp chuyên gia y tế hoặc người có chuyên môn ngay lập tức.
      
      4. QUAN TRỌNG: Không sử dụng các đề mục có dấu ### hay bất kỳ định dạng tiêu đề nào. Hãy viết nội dung theo phong cách kể chuyện, tư vấn mạch lạc, trôi chảy và tự nhiên như một cuộc trò chuyện trực tiếp.

      5. Cuối câu trả lời LUÔN kèm theo lưu ý: "Lưu ý: Lời khuyên này chỉ mang tính chất tham khảo. Sẽ tốt hơn nếu bạn nhờ đến người thân đáng tin cậy hoặc giáo viên để được tư vấn tốt hơn."`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "Bạn là TeenCare Soulmate, một chuyên gia tư vấn tâm lý học học đường thân thiện. Ngôn ngữ của bạn phải gần gũi, thấu cảm và an toàn. Tuyệt đối không sử dụng các ký tự định dạng tiêu đề như ###. Hãy viết văn bản mạch lạc, trôi chảy.",
        }
      });

      const adviceText = (response.text || "Xin lỗi, tôi không thể đưa ra lời khuyên lúc này.").replace(/\*/g, '').replace(/#/g, '');
      setAiAdvice(adviceText);
    } catch (error) {
      console.error("AI Error:", error);
      const userRole = 'Học sinh';
      const fallbackAdvice = `Chào ${profile.name}, mình là TeenCare Soulmate đây. Với vai trò là ${userRole}, mình thấu hiểu những áp lực và băn khoăn mà bạn đang chia sẻ.

Dựa trên quy trình tư vấn, mình xin đưa ra nhận định sơ bộ: Vấn đề của bạn có thể đang ở mức cần được quan tâm và xoa dịu ngay. Bạn không hề đơn độc trong hành trình này.

Một vài gợi ý hành động cho bạn:
- Thiết lập quan hệ: Thử mở lòng chia sẻ với một người đồng nghiệp hoặc bạn thân đáng tin cậy.
- Tìm kiếm giải pháp: Dành thời gian tĩnh lặng để nhìn nhận lại các nhân tố đang tác động đến mình.
- Thực hiện: Hãy luôn hướng tới những giá trị tích cực và đừng quên dành cho bản thân những lời khen ngợi vì đã nỗ lực đến tận bây giờ.

Mình hứa sẽ luôn đồng hành cùng bạn. Hãy tin rằng mọi chuyện rồi sẽ ổn thôi!

Lưu ý: Lời khuyên này chỉ mang tính chất tham khảo. Sẽ tốt hơn nếu bạn nhờ đến người thân đáng tin cậy hoặc giáo viên để được tư vấn tốt hơn.`;
      setAiAdvice(fallbackAdvice);
    } finally {
      setIsAiLoading(false);
    }
  };

  const weeklyMoodData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const entry = moodHistory.find(h => h.date.startsWith(date));
      const dayName = new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' });
      return {
        day: dayName,
        moodValue: entry ? (entry.mood === 'happy' || entry.mood === 'joyful' ? 3 : entry.mood === 'sad' || entry.mood === 'angry' ? 1 : 2) : 0,
        mood: entry?.mood
      };
    });
  }, [moodHistory]);

  const handleGetNutritionAdvice = async () => {
    setIsNutritionLoading(true);
    setNutritionAdvice("");

    try {
      const model = "gemini-3-flash-preview";
      const heightInMeters = profile.height / 100;
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      
      let bmiLabel = "Bình thường";
      if (bmi < 18.5) bmiLabel = "Thiếu cân";
      else if (bmi >= 23 && bmi < 25) bmiLabel = "Thừa cân";
      else if (bmi >= 25) bmiLabel = "Béo phì";

      const prompt = `Chào tôi, tôi là chuyên gia dinh dưỡng của TeenCare. Tôi đã nhận được thông tin của bạn:
      - Tên: ${profile.name}
      - Giới tính: ${profile.gender === 'male' ? 'Nam' : 'Nữ'}
      - Tuổi: ${profile.age}
      - Chiều cao: ${profile.height}cm
      - Cân nặng: ${profile.weight}kg
      - BMI: ${bmi.toFixed(1)} (${bmiLabel})
      - Mức độ vận động: ${ACTIVITY_LABELS[profile.activity]}
      - Mục tiêu hiện tại: ${NUTRITION_GOALS[currentNutritionGoal].label}

      Hãy phân tích sâu sự kết hợp giữa tình trạng BMI (${bmiLabel}) và mục tiêu (${NUTRITION_GOALS[currentNutritionGoal].label}) của bạn để đưa ra lời khuyên CỰC KỲ CHI TIẾT. 
      
      Yêu cầu:
      1. **Xưng hô**: Sử dụng "bạn" và "tôi" xuyên suốt cuộc trò chuyện. Ngôn ngữ chân thành, chuyên nghiệp nhưng gần gũi.
      2. **Phân tích chuyên sâu**: Tại sao với BMI hiện tại và mục tiêu này, bạn cần chế độ ăn như vậy? (Ví dụ: Nếu thiếu cân mà muốn tăng cơ, cần nạp dư calo và protein thế nào).
      3. **Thực đơn cụ thể kiểu Việt**: Đưa ra thực đơn 1 ngày với các món ăn CỰC KỲ CỤ THỂ và BÌNH DÂN (Ví dụ: thay vì nói "ăn đạm", hãy nói "1 bát con thịt nạc băm rim mặn" hoặc "2 quả trứng vịt lộn luộc").
         - Sáng: Món cụ thể.
         - Trưa: Mâm cơm cụ thể (Cơm + Món mặn + Món xào + Canh).
         - Tối: Mâm cơm cụ thể.
         - Bữa phụ (nếu cần cho mục tiêu): Món cụ thể.
      4. **Mẹo chế biến**: Cách nấu phù hợp với mục tiêu (Ví dụ: Giảm cân thì nên luộc rau muống lấy nước làm canh thay vì xào tỏi nhiều dầu).
      5. **Lời khuyên thói quen**: Uống nước, ngủ nghỉ, vận động bổ trợ.

      Lưu ý: Chỉ gợi ý các nguyên liệu dễ tìm, rẻ tiền, phù hợp với học sinh và gia đình Việt Nam. Tránh các thực phẩm ngoại nhập đắt đỏ.

      Cuối câu trả lời luôn kèm theo dòng: "Lời khuyên này chỉ mang tính chất tham khảo từ AI và dựa trên thói quen ăn uống phổ biến của người Việt."`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "Bạn là chuyên gia dinh dưỡng của TeenCare, xưng 'tôi' và gọi người dùng là 'bạn'. Bạn am hiểu ẩm thực Việt Nam và hỗ trợ học sinh xây dựng lối sống lành mạnh dựa trên BMI và mục tiêu cá nhân.",
        }
      });

      const advice = (response.text || "Xin lỗi, tôi không thể đưa ra lời khuyên lúc này.").replace(/\*/g, '').replace(/#/g, '');
      setNutritionAdvice(advice);
      
      // Save to history automatically when advice is generated
      const newEntry: NutritionEntry = {
        date: new Date().toISOString(),
        goal: currentNutritionGoal,
        advice: advice,
        waterIntake: waterIntake
      };
      addNutritionEntryToLocal(newEntry);
    } catch (error) {
      console.error("Nutrition AI Error:", error);
      setNutritionAdvice("Có lỗi xảy ra khi kết nối với AI. Hãy thử lại sau.");
    } finally {
      setIsNutritionLoading(false);
    }
  };

  const handleGetSleepAiAdvice = async (hours: number, quality: string, note: string) => {
    setIsSleepAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là một chuyên gia tư vấn giấc ngủ của hệ thống TeenCare. 
      Người dùng vừa ghi lại nhật ký giấc ngủ:
      - Số giờ ngủ: ${hours} giờ
      - Chất lượng: ${quality === 'good' ? 'Tốt' : quality === 'normal' ? 'Bình thường' : 'Kém'}
      - Ghi chú thêm: ${note || 'Không có'}
      
      Hãy đưa ra phân tích chi tiết và lời khuyên hữu ích để cải thiện giấc ngủ cho lứa tuổi học sinh. 
      Yêu cầu:
      1. Nội dung phải dài và chi tiết (khoảng 5 đoạn văn rõ ràng).
      2. MỖI ĐOẠN PHẢI CÁCH NHAU BẰNG 2 LẦN XUỐNG DÒNG (double newline) để tạo khoảng trống rõ rệt giữa các đoạn.
      3. Cấu trúc bắt buộc:
         - Lời chào: "Chào bạn,..."
         - Các đoạn phân tích và lời khuyên chi tiết.
         - Lời cảm ơn hoặc lời chúc ngủ ngon.
      4. Tuyệt đối KHÔNG sử dụng các ký tự định dạng như dấu sao (*), dấu thăng (#) hay bất kỳ ký tự đặc biệt nào để làm nổi bật văn bản. Hãy viết văn bản thuần túy.
      5. Cuối cùng, phải có dòng chữ: "Lưu ý: Những phân tích và lời khuyên từ AI chỉ mang tính chất tham khảo."
      6. Hãy xưng hô thân thiện là "TeenCare" và gọi người dùng là "bạn".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const adviceText = (response.text || "TeenCare chưa thể đưa ra lời khuyên lúc này. Hãy thử lại sau nhé!")
        .replace(/\*/g, '')
        .replace(/#/g, '');
      setSleepAiAdvice(adviceText);
    } catch (error) {
      console.error("AI Sleep Advice Error:", error);
      setSleepAiAdvice("TeenCare đang gặp chút trục trặc kỹ thuật. Bạn hãy chú ý ngủ đủ giấc và đúng giờ nhé!");
    } finally {
      setIsSleepAiLoading(false);
    }
  };

  const chartData = [
    { name: "BMI", value: bmiResult?.score || 0 }
  ];

  return (
    <div className={cn(
      "w-full max-w-screen-xl mx-auto min-h-screen flex flex-col p-4 sm:p-6 lg:p-10 relative overflow-hidden transition-colors duration-500",
      step === "vital_mind" ? mentalTheme.bg50 : step === "nutrition" ? nutritionTheme.bg50 : "bg-transparent"
    )}>
      {/* Background blobs */}
      <AnimatePresence>
        {step !== "vital_mind" && step !== "nutrition" && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute -top-20 -left-20 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl" 
            />
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl" 
            />
          </>
        )}
        {(step === "vital_mind" || step === "nutrition") && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full blur-3xl",
              step === "vital_mind" ? mentalTheme.bg200_20 : nutritionTheme.bg200_20
            )}
          />
        )}
      </AnimatePresence>

      {step === "loading" ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center"
          >
            <Heart className="text-red-400 fill-red-400 animate-pulse" size={48} />
          </motion.div>
          
          <div className="h-20 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xl font-medium text-slate-700 px-8"
              >
                {POSITIVE_QUOTES[quoteIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-12 w-full px-8">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              TeenCare • ĐỒNG HÀNH CÙNG SỨC KHỎE HỌC SINH.
            </p>
          </div>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Heart className="text-red-400 fill-red-400" size={24} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">TeenCare</h1>
            </div>
            <div className="flex items-center gap-3">
              {isProfileSetup && (
                <button 
                  onClick={() => setStep("profile_setup")}
                  className="flex flex-col items-end mr-2 hover:bg-slate-100 p-2 rounded-xl transition-all text-right"
                >
                  <p className="text-[10px] font-bold text-slate-800 leading-none">{profile.name || "Người dùng"}</p>
                  <div className="text-[8px] text-slate-400 font-medium">
                    {formatSchoolName(schoolProfile.school)}
                  </div>
                  <p className="text-[8px] text-slate-400 uppercase tracking-wider">
                    Lớp: {schoolProfile.className}
                  </p>
                </button>
              )}
              <div className="flex gap-2">
                {step !== "dashboard" && step !== "vital_mind" && step !== "nutrition" && step !== "profile_setup" && step !== "loading_after_setup" && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStep("vital_mind")}
                      className="p-2 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition-colors"
                      title="VitalMind"
                    >
                      <MessageSquare size={20} />
                    </button>
                    <button 
                      onClick={() => setStep("nutrition")}
                      className="p-2 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                      title="Dinh dưỡng"
                    >
                      <Utensils size={20} />
                    </button>
                  </div>
                )}
                {step !== "dashboard" && step !== "profile_setup" && step !== "loading_after_setup" && (
                  <button 
                    onClick={() => setStep("dashboard")}
                    className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <RefreshCw size={20} className="text-slate-600" />
                  </button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 relative z-10">
            <AnimatePresence mode="wait">
              {step === "dashboard" && (
                <Dashboard 
                  profile={profile}
                  bmiHistory={bmiHistory}
                  moodHistory={moodHistory}
                  nutritionHistory={nutritionHistory}
                  onNavigate={setStep}
                  onShowSettings={() => setShowSettings(true)}
                />
              )}

              {step === "profile_setup" && (
                <motion.div
                  key="profile_setup"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-slate-800">
                        {isProfileSetup ? "Chỉnh sửa hồ sơ" : "Thiết lập hồ sơ"}
                      </h2>
                      {isProfileSetup && (
                        <button 
                          onClick={() => setStep("dashboard")}
                          className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <ArrowLeft size={20} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">Chào mừng thành viên của TeenCare</p>
                  </div>

                  <div className="glass p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dữ liệu cá nhân</label>
                      <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-[10px] font-bold hover:bg-green-100 transition-all border border-green-100 shadow-sm"
                      >
                        <FileSpreadsheet size={12} /> Tải xuống Excel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Họ và tên</label>
                          <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            placeholder="Nhập tên của bạn..."
                            className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                            <div className="flex bg-white/50 rounded-xl p-1">
                              <button
                                onClick={() => setProfile({ ...profile, gender: "male" })}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                                  profile.gender === "male" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
                                )}
                              >
                                Nam
                              </button>
                              <button
                                onClick={() => setProfile({ ...profile, gender: "female" })}
                                className={cn(
                                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                                  profile.gender === "female" ? "bg-white shadow-sm text-pink-600" : "text-slate-400"
                                )}
                              >
                                Nữ
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tuổi</label>
                            <input
                              type="number"
                              value={profile.age}
                              onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chiều cao (cm)</label>
                            <input
                              type="number"
                              value={profile.height || ""}
                              onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) || 0 })}
                              placeholder="cm"
                              className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cân nặng (kg)</label>
                            <input
                              type="number"
                              value={profile.weight || ""}
                              onChange={(e) => setProfile({ ...profile, weight: parseInt(e.target.value) || 0 })}
                              placeholder="kg"
                              className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trường</label>
                          <input
                            type="text"
                            value={schoolProfile.school}
                            onChange={(e) => setSchoolProfile({ ...schoolProfile, school: e.target.value })}
                            placeholder="Nhập tên trường của bạn..."
                            className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lớp</label>
                          <input
                            type="text"
                            value={schoolProfile.className}
                            onChange={(e) => setSchoolProfile({ ...schoolProfile, className: e.target.value })}
                            placeholder="Nhập tên lớp của bạn..."
                            className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!profile.name || !profile.height || !profile.weight || !schoolProfile.school || !schoolProfile.className}
                    onClick={() => {
                      saveProfileToLocal(profile, schoolProfile);
                      setStep("dashboard");
                    }}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isProfileSetup ? "Lưu thay đổi" : "Hoàn tất thiết lập"} <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}

              {step === "loading_after_setup" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center"
                  >
                    <Sparkles className="text-blue-400 animate-pulse" size={48} />
                  </motion.div>
                  
                  <div className="h-20 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xl font-medium text-slate-700 px-8"
                      >
                        {POSITIVE_QUOTES[quoteIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  <div className="absolute bottom-12 w-full px-8">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                      TeenCare • ĐỒNG HÀNH CÙNG SỨC KHỎE HỌC SINH.
                    </p>
                  </div>
                </div>
              )}

              {step === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setStep("dashboard")} className="p-2 -ml-2">
                      <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-bold">Điền thông tin của bạn</h2>
                  </div>

                  <div className="glass p-6 rounded-3xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Tên của bạn</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Nhập tên của bạn..."
                        className="w-full bg-white/50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Giới tính</label>
                        <div className="flex bg-white/50 rounded-xl p-1">
                          <button
                            onClick={() => setProfile({ ...profile, gender: "male" })}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                              profile.gender === "male" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
                            )}
                          >
                            Nam
                          </button>
                          <button
                            onClick={() => setProfile({ ...profile, gender: "female" })}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                              profile.gender === "female" ? "bg-white shadow-sm text-pink-600" : "text-slate-400"
                            )}
                          >
                            Nữ
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Tuổi</label>
                        <input
                          type="number"
                          value={profile.age}
                          onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                          placeholder="Nhập tuổi..."
                          className="w-full bg-white/50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Chiều cao (cm)</label>
                        <input
                          type="number"
                          value={profile.height}
                          onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Cân nặng (kg)</label>
                        <input
                          type="number"
                          value={profile.weight}
                          onChange={(e) => setProfile({ ...profile, weight: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      saveProfileToLocal(profile, schoolProfile);
                      setStep("result");
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Phân tích ngay
                  </button>
                </motion.div>
              )}

              {step === "result" && bmiResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 pb-12"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Kết quả của {profile.name || "bạn"}</h2>
                    <div className="px-3 py-1 bg-white/50 rounded-full text-xs font-bold text-slate-500">
                      Tiêu chuẩn Châu Á
                    </div>
                  </div>

                  {/* BMI Card */}
                  <div className="glass p-6 rounded-[2rem] text-center space-y-4">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Chỉ số BMI</p>
                      <p className={cn("text-6xl font-black", bmiResult.color)}>
                        {bmiResult.score.toFixed(1)}
                      </p>
                      <div className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-white/50 mt-2">
                        <span className={cn("font-bold", bmiResult.color)}>{bmiResult.label}</span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed px-4 italic">
                      "{bmiResult.description}"
                    </p>

                    {/* BMI Scale Chart */}
                    <div className="h-24 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <XAxis type="number" domain={[0, 40]} hide />
                          <YAxis type="category" dataKey="name" hide />
                          <Tooltip cursor={{ fill: 'transparent' }} content={() => null} />
                          <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={20}>
                            <Cell fill={bmiResult.color.includes('blue') ? '#60a5fa' : bmiResult.color.includes('green') ? '#4ade80' : bmiResult.color.includes('yellow') ? '#fbbf24' : '#f87171'} />
                          </Bar>
                          <ReferenceLine x={18.5} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'top', value: '18.5', fontSize: 10 }} />
                          <ReferenceLine x={23} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'top', value: '23', fontSize: 10 }} />
                          <ReferenceLine x={25} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'top', value: '25', fontSize: 10 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Utensils size={20} className="text-green-600" />
                      <h3 className="font-bold text-lg">Dinh dưỡng gợi ý</h3>
                    </div>
                    <div className="grid gap-3">
                      {bmiResult.nutrition.map((item, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={i} 
                          className="glass p-4 rounded-2xl flex items-start gap-3"
                        >
                          <div className="mt-1"><CheckCircle2 size={18} className="text-green-500" /></div>
                          <p className="text-sm font-medium text-slate-700">{item}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Dumbbell size={20} className="text-orange-600" />
                      <h3 className="font-bold text-lg">Lộ trình tập luyện</h3>
                    </div>
                    <div className="grid gap-3">
                      {bmiResult.exercise.map((item, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (i + 3) * 0.1 }}
                          key={i} 
                          className="glass p-4 rounded-2xl flex items-start gap-3"
                        >
                          <div className="mt-1"><Activity size={18} className="text-orange-500" /></div>
                          <p className="text-sm font-medium text-slate-700">{item}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="glass p-6 rounded-3xl bg-slate-900/5 border-none">
                    <div className="flex items-center gap-3 mb-2">
                      <Info className="text-slate-400" size={20} />
                      <h4 className="font-bold text-slate-500 text-sm uppercase tracking-wider">Lưu ý quan trọng</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Chỉ số BMI chỉ mang tính chất tham khảo tương đối. Để có đánh giá chính xác nhất về sức khỏe, bạn nên tham khảo ý kiến của bác sĩ hoặc chuyên gia dinh dưỡng.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("input")}
                      className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Tính lại
                    </button>
                    <button
                      onClick={saveBMI}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Save size={20} /> Lưu kết quả
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "vital_mind" && (
                <VitalMindScreen
                  onBack={() => setStep("dashboard")}
                  moodHistory={moodHistory}
                  currentMood={currentMood}
                  setCurrentMood={setCurrentMood}
                  moodNote={moodNote}
                  setMoodNote={setMoodNote}
                  saveMood={saveMood}
                  gratitudeEntries={gratitudeEntries}
                  setGratitudeEntries={setGratitudeEntries}
                  aiAdvice={aiAdvice}
                  setAiAdvice={setAiAdvice}
                  isAiLoading={isAiLoading}
                  handleGetAiAdvice={handleGetAiAdvice}
                  mentalIssue={mentalIssue}
                  setMentalIssue={setMentalIssue}
                  followUpNote={followUpNote}
                  setFollowUpNote={setFollowUpNote}
                  showMoodHistory={showMoodHistory}
                  setShowMoodHistory={setShowMoodHistory}
                  theme={mentalTheme}
                  addAiFeedbackToLocal={addAiFeedbackToLocal}
                  addGratitudeEntryToLocal={addGratitudeEntryToLocal}
                  setSuccessMessage={setSuccessMessage}
                  onDeleteGratitude={deleteGratitudeEntry}
                  onDeleteMood={deleteMoodEntry}
                  sleepHistory={sleepHistory}
                  addSleepEntryToLocal={addSleepEntryToLocal}
                  deleteSleepEntry={deleteSleepEntry}
                  handleGetSleepAiAdvice={handleGetSleepAiAdvice}
                  isSleepAiLoading={isSleepAiLoading}
                  setIsSleepAiLoading={setIsSleepAiLoading}
                  sleepAiAdvice={sleepAiAdvice}
                  setSleepAiAdvice={setSleepAiAdvice}
                />
              )}

              {step === "nutrition" && (
                <motion.div
                  key="nutrition"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6 pb-20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setStep("dashboard")} className="p-2 -ml-2">
                        <ArrowLeft size={24} />
                      </button>
                      <h2 className={cn("text-2xl font-bold", nutritionTheme.text900)}>Dinh dưỡng</h2>
                    </div>
                    <button 
                      onClick={() => setShowNutritionHistory(!showNutritionHistory)}
                      className={cn(
                        "p-2 rounded-xl flex items-center gap-1 text-sm font-bold transition-all",
                        showNutritionHistory ? cn(nutritionTheme.bg600, "text-white") : cn(nutritionTheme.bg100, nutritionTheme.text600)
                      )}
                    >
                      <History size={18} /> {showNutritionHistory ? "Đóng lịch sử" : "Lịch sử"}
                    </button>
                  </div>

                  {!showNutritionHistory ? (
                    <>
                      {/* Goal Selection */}
                      <div className={cn("glass p-6 rounded-3xl space-y-4", nutritionTheme.bg100)}>
                        <h3 className={cn("font-bold", nutritionTheme.text800)}>Mục tiêu của bạn</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.entries(NUTRITION_GOALS) as [NutritionGoal, typeof NUTRITION_GOALS['maintenance']][]).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => setCurrentNutritionGoal(key)}
                              className={cn(
                                "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-2 text-center",
                                currentNutritionGoal === key 
                                  ? cn("bg-white shadow-md scale-105", nutritionTheme.border400) 
                                  : "bg-white/30 border-transparent opacity-70"
                              )}
                            >
                              <span className={cn("text-xs font-bold", config.color)}>{config.label}</span>
                              <span className="text-[8px] text-slate-500 leading-tight">{config.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Daily Habits */}
                      <div className={cn("glass p-6 rounded-3xl space-y-4", nutritionTheme.bg100)}>
                        <div className="flex items-center justify-between">
                          <h3 className={cn("font-bold", nutritionTheme.text800)}>Thói quen hàng ngày</h3>
                          <Droplets size={18} className="text-blue-400" />
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-white/50 p-4 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Droplets size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">Lượng nước</p>
                                <p className="text-[10px] text-slate-500">Mục tiêu: 6-8 ly/ngày</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"
                              >-</button>
                              <span className="font-bold text-lg text-blue-600">{waterIntake}</span>
                              <button 
                                onClick={() => setWaterIntake(waterIntake + 1)}
                                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600"
                              >+</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Advice */}
                      <div className={cn("glass p-6 rounded-3xl space-y-4", nutritionTheme.bg100)}>
                        <div className="flex items-center gap-2">
                          <Sparkles className={nutritionTheme.text500} size={20} />
                          <h3 className={cn("font-bold", nutritionTheme.text800)}>Tư vấn dinh dưỡng AI</h3>
                        </div>
                        <p className="text-xs text-black leading-relaxed">
                          Dựa trên thông tin cơ thể và mục tiêu của bạn, AI sẽ xây dựng một chế độ ăn uống cực kỳ chi tiết.
                        </p>
                        <button
                          onClick={handleGetNutritionAdvice}
                          disabled={isNutritionLoading}
                          className={cn("w-full py-4 text-black rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all", nutritionTheme.bg600, nutritionTheme.hoverBg700)}
                        >
                          {isNutritionLoading ? (
                            <RefreshCw className="animate-spin" size={20} />
                          ) : (
                            <>Nhận thực đơn chi tiết <ChevronRight size={18} /></>
                          )}
                        </button>

                        <AnimatePresence>
                          {nutritionAdvice && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className={cn("mt-4 p-5 bg-white rounded-3xl border shadow-sm space-y-4", nutritionTheme.border100)}
                            >
                              <div className={cn("flex items-center gap-2", nutritionTheme.text600)}>
                                <UserCircle size={20} />
                                <span className="font-bold text-sm">Thực đơn & Lời khuyên</span>
                              </div>
                              <div className="text-sm text-black leading-relaxed whitespace-pre-wrap markdown-body">
                                {nutritionAdvice}
                              </div>

                              {/* Recommended Resources for Nutrition */}
                              <div className={cn("pt-4 border-t space-y-3", nutritionTheme.border50)}>
                                <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", nutritionTheme.text800)}>
                                  <PlayCircle size={14} /> Tài liệu gợi ý cho bạn
                                </h4>
                                <div className="grid gap-2">
                                  {NUTRITION_RESOURCES[currentNutritionGoal].map((res, idx) => (
                                    <a 
                                      key={idx} 
                                      href={res.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className={cn("flex items-center justify-between p-3 rounded-2xl transition-colors group", nutritionTheme.bg50, nutritionTheme.hoverBg100)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={cn("p-2 bg-white rounded-lg shadow-sm", nutritionTheme.text500)}>
                                          {res.type === 'video' ? <PlayCircle size={16} /> : <Utensils size={16} />}
                                        </div>
                                        <div>
                                          <p className={cn("text-[11px] font-bold text-black transition-colors", `group-hover:${nutritionTheme.text700}`)}>{res.title}</p>
                                          <p className="text-[9px] text-black">{res.category} • {res.type === 'video' ? 'Video ngắn' : 'Bài viết'}</p>
                                        </div>
                                      </div>
                                      <ChevronRight size={14} className={cn("text-slate-300 transition-colors", `group-hover:${nutritionTheme.text500}`)} />
                                    </a>
                                  ))}
                                </div>
                              </div>

                              <div className={cn("p-3 rounded-2xl space-y-2", nutritionTheme.bg50)}>
                                <h4 className={cn("text-xs font-bold uppercase tracking-wider", nutritionTheme.text800)}>Nguyên tắc 4 nhóm chất</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="text-[10px] text-black bg-white/50 p-2 rounded-lg">
                                    <b>Carbohydrate (60-70%):</b> Cơm trắng, bún, phở, khoai lang, ngô luộc.
                                  </div>
                                  <div className="text-[10px] text-black bg-white/50 p-2 rounded-lg">
                                    <b>Protein (12-15%):</b> Thịt lợn, thịt gà, cá đồng, trứng, đậu phụ, các loại đậu.
                                  </div>
                                  <div className="text-[10px] text-black bg-white/50 p-2 rounded-lg">
                                    <b>Chất béo (18-25%):</b> Dầu thực vật, lạc (đậu phộng), vừng (mè), mỡ cá.
                                  </div>
                                  <div className="text-[10px] text-black bg-white/50 p-2 rounded-lg">
                                    <b>Vitamin & Khoáng chất:</b> Rau muống, rau ngót, cải xanh, trái cây theo mùa.
                                  </div>
                                </div>
                                <div className="mt-2 p-2 bg-blue-50 rounded-lg text-[10px] text-black">
                                  <b>Lưu ý:</b> Uống đủ 1.5 - 2 lít nước mỗi ngày và hạn chế muối, đường.
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className={cn("glass p-6 rounded-3xl space-y-4", nutritionTheme.bg100)}>
                        <h3 className={cn("font-bold flex items-center gap-2", nutritionTheme.text800)}>
                          <Calendar size={20} /> Lịch sử tư vấn dinh dưỡng
                        </h3>
                        
                        {nutritionHistory.length === 0 ? (
                          <p className="text-center text-slate-400 py-8 text-sm">Chưa có lịch sử tư vấn.</p>
                        ) : (
                          <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {(Array.from(new Set([...nutritionHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(h => h.date.substring(0, 7)))) as string[]).map(month => (
                              <div key={month} className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                                  Tháng {new Date(month + "-01").getMonth() + 1}, {new Date(month + "-01").getFullYear()}
                                </h4>
                                <div className="grid gap-3">
                                  {[...nutritionHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter(h => h.date.startsWith(month)).map((entry, i) => (
                                    <div key={i} className="bg-white/60 p-4 rounded-2xl space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-sm", NUTRITION_GOALS[entry.goal].color)}>
                                            {NUTRITION_GOALS[entry.goal].label}
                                          </span>
                                          <span className="text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1 text-blue-500 text-[10px] font-bold">
                                            <Droplets size={12} /> {entry.waterIntake} ly
                                          </div>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteNutritionEntry(entry.date);
                                            }}
                                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="text-[10px] text-slate-600 line-clamp-3 italic">
                                        {entry.advice}
                                      </div>
                                      <button 
                                        onClick={() => {
                                          setNutritionAdvice(entry.advice);
                                          setCurrentNutritionGoal(entry.goal);
                                          setWaterIntake(entry.waterIntake);
                                          setShowNutritionHistory(false);
                                        }}
                                        className={cn("text-[10px] font-bold hover:underline", nutritionTheme.text600)}
                                      >
                                        Xem chi tiết
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              {step === "exercise" && (
                <ExerciseScreen 
                  profile={profile}
                  onLogWorkout={addWorkoutEntryToLocal}
                  onBack={() => setStep("dashboard")}
                  theme={exerciseTheme}
                />
              )}

              {step === "history" && (
                <HistoryScreen 
                  bmiHistory={bmiHistory}
                  moodHistory={moodHistory}
                  nutritionHistory={nutritionHistory}
                  workoutHistory={workoutHistory}
                  sleepHistory={sleepHistory}
                  gratitudeEntries={gratitudeEntries}
                  onBack={() => setStep("dashboard")}
                  onDelete={(type, id) => {
                    if (type === "bmi") deleteBmiEntry(id);
                    else if (type === "mood") deleteMoodEntry(id);
                    else if (type === "nutrition") deleteNutritionEntry(id);
                    else if (type === "workout") deleteWorkoutEntry(id);
                    else if (type === "sleep") deleteSleepEntry(id);
                    else if (type === "gratitude") deleteGratitudeEntry(id);
                  }}
                  onExportExcel={exportToExcel}
                  theme={mainTheme}
                />
              )}
            </AnimatePresence>
          </main>

          <footer className="mt-auto py-4 text-center relative z-10">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              TeenCare • ĐỒNG HÀNH CÙNG SỨC KHỎE HỌC SINH.
            </p>
          </footer>
        </>
      )}
      {/* Settings Modal */}
      <AnimatePresence>
        {isReloading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
          >
            <RefreshCw className="animate-spin text-blue-500 mb-4" size={48} />
            <p className="text-lg font-bold text-slate-800 animate-pulse">Đang cập nhật giao diện...</p>
          </motion.div>
        )}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <Palette size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Tùy chỉnh màu sắc</h3>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dữ liệu & Hồ sơ</p>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl text-emerald-600 hover:bg-emerald-100 transition-all"
                    >
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Download size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Sao lưu dữ liệu</p>
                        <p className="text-[10px] opacity-70">Tải xuống toàn bộ lịch sử sức khỏe</p>
                      </div>
                    </button>
                    {!showDeleteAllConfirm ? (
                      <button
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-red-600 hover:bg-red-100 transition-all w-full"
                      >
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Trash2 size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">Xóa toàn bộ dữ liệu</p>
                          <p className="text-[10px] opacity-70">Xóa hồ sơ và lịch sử sức khỏe</p>
                        </div>
                      </button>
                    ) : (
                      <div className="p-4 bg-red-100 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-red-700 text-center">Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowDeleteAllConfirm(false)}
                            className="flex-1 py-2 bg-white rounded-xl text-xs font-bold text-slate-600"
                          >
                            Hủy
                          </button>
                          <button 
                            onClick={() => {
                              localStorage.clear();
                              window.location.reload();
                            }}
                            className="flex-1 py-2 bg-red-600 rounded-xl text-xs font-bold text-white"
                          >
                            Xác nhận xóa
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowSettings(false);
                        setStep("profile_setup");
                      }}
                      className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <User size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Thay đổi hồ sơ</p>
                        <p className="text-[10px] opacity-70">Cập nhật thông tin cá nhân và trường học</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Màu sắc chủ đạo</p>
                  <p className="text-[10px] text-slate-400 italic">Áp dụng cho Tâm lý, Dinh dưỡng & Luyện tập</p>
                  <div className="flex flex-wrap gap-3">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setIsReloading(true);
                          setTimeout(() => {
                            updateThemeInLocal(opt.value);
                            setIsReloading(false);
                          }, 1000);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-full transition-all flex items-center justify-center relative",
                          opt.color,
                          theme.color === opt.value ? "ring-4 ring-offset-2 ring-slate-200 scale-110" : "opacity-60 hover:opacity-100"
                        )}
                      >
                        {theme.color === opt.value && <CheckCircle2 size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition-all"
              >
                Hoàn tất
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 whitespace-nowrap"
          >
            <CheckCircle2 className="text-emerald-400" size={20} />
            <p className="text-sm font-bold">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
