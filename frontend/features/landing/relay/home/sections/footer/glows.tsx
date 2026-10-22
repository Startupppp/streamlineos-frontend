import Image from "next/image";

export const Glows = () => (
  <div aria-hidden className="pointer-events-none">
    <Image
      src="/landing/relay/footer/footer-bloom.png"
      unoptimized
      alt=""
      width={940}
      height={680}
      className="absolute -top-25 left-185 h-170 w-235 max-w-none w1024:-top-48 w1024:-left-66 w1024:w-388 w768:-top-40 w768:-left-49.5 w768:w-291 w390:-top-58 w390:-left-25.25 w390:w-147.75"
    />
    <Image
      src="/landing/relay/footer/footer-aurora-blue.png"
      unoptimized
      alt=""
      width={1420}
      height={800}
      className="absolute -top-72 left-10 h-200 w-355 max-w-none w1024:-top-48 w1024:-left-37.25 w1024:w-330.5 w768:-top-40 w768:-left-28 w768:w-247.75 w390:-top-58 w390:-left-14.25 w390:w-125.75"
    />
    <Image
      src="/landing/relay/footer/footer-aurora-violet.png"
      unoptimized
      alt=""
      width={960}
      height={700}
      className="absolute -top-17 left-195 h-175 w-240 max-w-none w1024:-top-48 w1024:-left-64 w1024:w-384 w768:-top-40 w768:-left-48 w768:w-288 w390:-top-58 w390:-left-24.5 w390:w-146.25"
    />
  </div>
);
