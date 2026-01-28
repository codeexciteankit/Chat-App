const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-500 to-purple-600 text-white p-10 flex-col justify-center items-center">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p className="text-lg text-center">{subtitle}</p>

      <div className="hidden lg:flex items-center justify-center bg-base-200 p-12">
        <div className="max-w-md text-center">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-2xl bg-primary/10 ${
                  i % 2 === 0 ? "animate-pulse" : ""
                }`}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <p className="text-base-content/60">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthImagePattern;
