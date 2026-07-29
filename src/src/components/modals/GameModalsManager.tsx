import React from 'react';
import { Player } from '../../types/player.types';
import { DiscardOverlay } from './DiscardOverlay';
import { MonopolyModal } from './MonopolyModal';
import { YearOfPlentyModal } from './YearOfPlentyModal';
import { GoldFieldSelectionModal } from './GoldFieldSelectionModal';
import { TrophyDetailModal } from './TrophyModal';
import { GameOverRatingModal } from './GameOverRatingModal';
import { PlayerStatsModal } from './PlayerStatsModal';
import { useUser } from '../../context/UserContext';

interface GameModalsManagerProps {
  isMonopolyModalOpen: boolean;
  setIsMonopolyModalOpen: (open: boolean) => void;
  isYearOfPlentyModalOpen: boolean;
  setIsYearOfPlentyModalOpen: (open: boolean) => void;
  players: Player[];
  humanPlayer: Player;
  setPlayers: any;
  addLog: (msg: string) => void;
  activeTrophyModal: 'longest_road' | 'largest_army' | null;
  setActiveTrophyModal: (type: 'longest_road' | 'largest_army' | null) => void;
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
}

export const GameModalsManager: React.FC<GameModalsManagerProps> = ({
  isMonopolyModalOpen,
  setIsMonopolyModalOpen,
  isYearOfPlentyModalOpen,
  setIsYearOfPlentyModalOpen,
  players,
  humanPlayer,
  setPlayers,
  addLog,
  activeTrophyModal,
  setActiveTrophyModal,
  longestRoadPlayerId,
  largestArmyPlayerId,
}) => {
const { lastRatingResult, setLastRatingResult, isStatsModalOpen, setIsStatsModalOpen } = useUser();

  return (
    <>
      {/* מודל מונופול לקבלת משאבים */}
      <MonopolyModal
        isOpen={isMonopolyModalOpen}
        onClose={() => setIsMonopolyModalOpen(false)}
        players={players}
        humanPlayer={humanPlayer}
        setPlayers={setPlayers}
        addLog={addLog}
      />

      {/* מודל שנת שפע לבחירת משאבים */}
      <YearOfPlentyModal
        isOpen={isYearOfPlentyModalOpen}
        onClose={() => setIsYearOfPlentyModalOpen(false)}
        humanPlayer={humanPlayer}
        setPlayers={setPlayers}
        addLog={addLog}
      />

      {/* מודל בחירת זהב ממכרה זהב */}
      <GoldFieldSelectionModal />

      {/* קומפוננטת Overlay במסך מלא עבור זריקת משאבים כשהשודד מופעל */}
      <DiscardOverlay />

{/* מודל תארים צף גדול במרכז */}
      <TrophyDetailModal
        isOpen={!!activeTrophyModal}
        type={activeTrophyModal!}
        longestRoadPlayerId={longestRoadPlayerId}
        largestArmyPlayerId={largestArmyPlayerId}
        players={players}
        onClose={() => setActiveTrophyModal(null)}
      />

      {/* מודל סיכום דירוג בסיום משחק */}
      {lastRatingResult && (
        <GameOverRatingModal
          result={lastRatingResult}
          onClose={() => setLastRatingResult(null)}
        />
      )}

      {/* מודל סטטיסטיקות שחקן ומטריצת ניקוד */}
      <PlayerStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />
    </>
  );
};