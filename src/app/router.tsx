import { Navigate, Route, Routes } from 'react-router-dom';
import { BuildScreen } from '../features/build/BuildScreen';
import { LessonScreen } from '../features/lesson/LessonScreen';
import { ShopScreen } from '../features/shop/ShopScreen';
import { EggsScreen } from '../features/eggs/EggsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<BuildScreen />} />
      <Route path="/lesson" element={<LessonScreen />} />
      <Route path="/shop" element={<ShopScreen />} />
      <Route path="/eggs" element={<EggsScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
