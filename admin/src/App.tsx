import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './layout/AppShell'
import Dashboard from './pages/Dashboard'
import MatchesList from './pages/MatchesList'
import MatchHub from './pages/MatchHub'
import MatchInfo from './pages/MatchInfo'
import PreMatch from './pages/PreMatch'
import LiveControl from './pages/LiveControl'
import MatchStatistics from './pages/MatchStatistics'
import UpcomingFixturesPage from './pages/UpcomingFixturesPage'
import Players from './pages/Players'
import CompetitionTeamsPage from '@/features/player/ui/CompetitionTeamsPage'
import TeamDetailPage from '@/features/player/ui/TeamDetailPage'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import LoginPage from '@/features/auth/ui/LoginPage'
import ProtectedRoute from '@/features/auth/ui/ProtectedRoute'
import PermissionRoute from '@/features/auth/ui/PermissionRoute'
import UsersListPage from '@/features/user/ui/UsersListPage'
import UserDetailPage from '@/features/user/ui/UserDetailPage'
import NewsListPage from '@/features/news/ui/NewsListPage'
import NewsEditorPage from '@/features/news/ui/NewsEditorPage'
import NewsPostDetailPage from '@/features/news/ui/NewsPostDetailPage'
import DiwaniyaHubPage from '@/features/diwaniya/ui/DiwaniyaHubPage'
import DiwaniyaPostDetailPage from '@/features/diwaniya/ui/DiwaniyaPostDetailPage'
import ChallengeDashboardPage from '@/features/challenge/ui/ChallengeDashboardPage'
import QuestionBankPage from '@/features/challenge/ui/QuestionBankPage'
import QuestionEditorPage from '@/features/challenge/ui/QuestionEditorPage'
import ChallengeHistoryPage from '@/features/challenge/ui/ChallengeHistoryPage'
import NotificationsHubPage from '@/features/notifications/ui/NotificationsHubPage'
import SettingsPage from '@/features/settings/ui/SettingsPage'
import ActivityLogTab from '@/features/settings/ui/tabs/ActivityLogTab'
import AdminManagementTab from '@/features/settings/ui/tabs/AdminManagementTab'
import TierThresholdsTab from '@/features/settings/ui/tabs/TierThresholdsTab'
import AdsConfigTab from '@/features/settings/ui/tabs/AdsConfigTab'
import MembershipPlansTab from '@/features/settings/ui/tabs/MembershipPlansTab'
import StadiumsPage from '@/features/coverage/ui/StadiumsPage'
import CommentatorsPage from '@/features/coverage/ui/CommentatorsPage'
import RefereesPage from '@/features/coverage/ui/RefereesPage'
import ChannelsPage from '@/features/coverage/ui/ChannelsPage'
import CoverageMatchesPage from '@/features/coverage/ui/CoverageMatchesPage'
import CoverageMatchDetailPage from '@/features/coverage/ui/CoverageMatchDetailPage'

function MatchDefaultTab() {
  return <Navigate to="info" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/matches" element={<MatchesList />} />
            <Route path="/matches/upcoming" element={<UpcomingFixturesPage />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/competition/:leagueId" element={<CompetitionTeamsPage />} />
            <Route path="/players/competition/:leagueId/team/:teamId" element={<TeamDetailPage />} />
            <Route path="/matches/:id" element={<MatchHub />}>
              <Route index element={<MatchDefaultTab />} />
              <Route path="info" element={<MatchInfo />} />
              <Route path="pre-match" element={<PreMatch />} />
              <Route path="live" element={<LiveControl />} />
              <Route path="events" element={<LiveControl />} />
              <Route path="statistics" element={<MatchStatistics />} />
            </Route>
            <Route element={<PermissionRoute permission="coverage" />}>
              <Route path="/commentators" element={<CommentatorsPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/stadiums" element={<StadiumsPage />} />
              <Route path="/referees" element={<RefereesPage />} />
              <Route path="/coverage/matches" element={<CoverageMatchesPage />} />
              <Route path="/coverage/matches/:matchId" element={<CoverageMatchDetailPage />} />
            </Route>
            <Route path="/profile" element={<Profile />} />
            <Route path="/news" element={<NewsListPage />} />
            <Route path="/news/new" element={<NewsEditorPage />} />
            <Route path="/news/:id" element={<NewsPostDetailPage />} />
            <Route path="/news/:id/edit" element={<NewsEditorPage />} />
            <Route path="/diwaniya" element={<DiwaniyaHubPage />} />
            <Route path="/diwaniya/:id" element={<DiwaniyaPostDetailPage />} />
            <Route element={<PermissionRoute permission="challenges" />}>
              <Route path="/challenges" element={<ChallengeDashboardPage />} />
              <Route path="/challenges/bank" element={<QuestionBankPage />} />
              <Route path="/challenges/bank/new" element={<QuestionEditorPage />} />
              <Route path="/challenges/bank/:id" element={<QuestionEditorPage />} />
              <Route path="/challenges/history" element={<ChallengeHistoryPage />} />
            </Route>
            <Route element={<PermissionRoute permission="users" />}>
              <Route path="/users" element={<UsersListPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
            </Route>
            <Route element={<PermissionRoute permission="notifications" />}>
              <Route path="/notifications" element={<NotificationsHubPage />} />
            </Route>
            <Route path="/activity-log" element={<Navigate to="/settings/log" replace />} />
            <Route path="/settings" element={<SettingsPage />}>
              <Route index element={<Navigate to="/settings/log" replace />} />
              <Route path="log" element={<ActivityLogTab />} />
              <Route path="admins" element={<AdminManagementTab />} />
              <Route path="tiers" element={<TierThresholdsTab />} />
              <Route path="ads" element={<AdsConfigTab />} />
              <Route path="membership" element={<MembershipPlansTab />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
