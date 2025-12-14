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
  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white p-5 rounded-2xl text-center space-y-2 shadow-xl ring-1 ring-white/20">
    <h1 className="text-lg sm:text-xl font-extrabold tracking-tight drop-shadow-sm">
      {schoolName}
    </h1>
    <h2 className="text-md text-white/90">{managerName}</h2>
    <div className="text-sm flex justify-center gap-4 font-medium">
      <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
        {gregorianDate}
      </span>
      <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
        {hijriDate}
      </span>
    </div>
  </div>
);
