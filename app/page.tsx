// app/page.tsx
'use client';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'] });

export default function WelcomePage() {
  return (
    <main className={montserrat.className}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="w-full max-w-sm bg-gray-800 rounded-xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2">
            Bienvenido a tu nueva vida financiera sin excusas.
          </h1>
          <p className="text-center text-gray-400 mb-8">
            ¿Listo para poner orden sin morir de aburrimiento?
          </p>
          <div className="flex flex-col space-y-3 mb-6">
            {/* Estos botones los haremos funcionales cuando implementemos el login */}
            <button className="flex items-center justify-center w-full bg-white text-black font-semibold py-2.5 rounded-lg">
              <span className="mr-2"></span> Continuar con Apple
            </button>
            <button className="flex items-center justify-center w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg">
              <span className="mr-2">G</span> Continuar con Google
            </button>
          </div>
          <div className="flex items-center my-6"><hr className="w-full border-gray-600" /><span className="px-2 text-gray-400">o</span><hr className="w-full border-gray-600" /></div>
          <form className="flex flex-col space-y-4">
            <input type="email" placeholder="Tu email" className="bg-gray-700 border-2 border-gray-600 rounded-lg p-3 focus:outline-none focus:border-green-500" />
            <input type="password" placeholder="Tu contraseña" className="bg-gray-700 border-2 border-gray-600 rounded-lg p-3 focus:outline-none focus:border-green-500" />
            <button type="submit" className="w-full bg-green-500 text-gray-900 font-bold py-3 rounded-lg hover:bg-green-600">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}