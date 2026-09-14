type HeaderCardProps = {
  schoolName: string;
  managerName: string;
  gregorianDate: string;
  hijriDate: string;
};

export const HeaderCard = ({
  schoolName,
  managerName,
  gregorianDate,
  hijriDate,
}: HeaderCardProps) => (
  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white px-4 py-3 sm:p-5 rounded-2xl text-center space-y-1 sm:space-y-2 shadow-xl ring-1 ring-white/20">
    <h1 className="text-lg sm:text-xl font-extrabold tracking-tight drop-shadow-sm">
      {schoolName}
    </h1>
    <h2 className="text-xs leading-relaxed sm:text-base text-white/90">{managerName}</h2>
    <div className="text-xs sm:text-sm flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-4 font-medium">
      <span className="whitespace-nowrap sm:px-3 sm:py-1 sm:rounded-full sm:bg-white/15 sm:backdrop-blur-sm">
        <bdi dir="ltr">{gregorianDate}</bdi> م
      </span>
      <span aria-hidden="true" className="text-white/60 sm:hidden">·</span>
      <span className="whitespace-nowrap sm:px-3 sm:py-1 sm:rounded-full sm:bg-white/15 sm:backdrop-blur-sm">
        <bdi dir="ltr">{hijriDate}</bdi> هـ
      </span>
    </div>
  </div>
);
