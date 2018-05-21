import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

contract('CoinSparrow', function ([_owner, _hirer, _contractor,
  _newArbitrator, _withdrawAccount, _,
]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(
      web3.toWei(MAX_SEND, 'ether')),
    {
      from: _owner,
    });
    jobNum++;
    //    _jobId = web3.fromAscii(hashids.encode(jobNum));
    _jobId = hashids.encode(jobNum);
    // console.log(_jobId);
  });

  /*
   * Releasing Funds and fee calculation
   */
  describe('Releasing Funds and fee calculation', function () {
    it(
      'Funds should be released (with job flagged as complete)',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;
      });

    it(
      'Funds should be released (job NOT flagged as complete)',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;
      });

    it('Only Hirer can call hirerReleaseFunds', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejected;
      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _owner,
        })
        .should.be.rejected;
      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: 0x0,
        })
        .should.be.rejected;
      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;
    });

    it('Hirer cannot double release funds', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;
      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it(
      'Contractor cannot get funds themselves before specified time',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await increaseTimeTo(latestTime() + duration.weeks(
          2));
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
      });

    it('Contractor cannot double release funds', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;
      await this.coinSparrow.contractorReleaseFunds(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejected;
      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;
      await this.coinSparrow.contractorReleaseFunds(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejected;
      await this.coinSparrow.jobCompleted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;
      await this.coinSparrow.contractorReleaseFunds(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejected;

      await increaseTimeTo(latestTime() + duration.weeks(
        4) + duration.seconds(1));
      await this.coinSparrow.contractorReleaseFunds(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      await this.coinSparrow.contractorReleaseFunds(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejected;
    });

    it(
      'Contractor can get funds themselves after specified time if Hirer is unresponsive',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;

        await increaseTimeTo(latestTime() + duration.weeks(
          4) + duration.seconds(1));
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it('Only Contractor can call contractorReleaseFunds',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await increaseTimeTo(latestTime() + duration.weeks(
          4) + duration.seconds(1));

        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _owner,
          })
          .should.be.rejected;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejected;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: 0x0,
          })
          .should.be.rejected;
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it(
      'Hirer funds should be correctly calculated after Hirer release',
      async function () {
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(_value);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost);

        hirerPost.plus(_value)
          .plus(gasCost)
          .should.be.bignumber.equal(hirerPre);
      });

    it(
      'Contractor funds should be correctly calculated after Hirer release',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const contractorPre = web3.eth.getBalance(
          _contractor);

        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const contractorPost = web3.eth.getBalance(
          _contractor);

        contractorPre.plus(_value.minus(_fee))
          .should.be.bignumber.equal(contractorPost);
      });

    it(
      'CoinSparrow Fees should be correctly calculated after successful Hirer release',
      async function () {
        const feesPre = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const feesPost = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        feesPost.minus(feesPre)
          .should.be.bignumber.equal(_fee);
      });

    it(
      'Hirer funds should be correctly calculated after Contractor release',
      async function () {
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(_value);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await increaseTimeTo(latestTime() + duration.weeks(
          5));
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost);

        hirerPost.plus(_value)
          .plus(gasCost)
          .should.be.bignumber.equal(hirerPre);
      });

    it(
      'Contractor funds should be correctly calculated after Contractor release',
      async function () {
        const contractorPre = web3.eth.getBalance(
          _contractor);
        const contractorPreForGasCalc = contractorPre.minus(
          _value);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await increaseTimeTo(latestTime() + duration.weeks(
          5));
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const contractorPost = web3.eth.getBalance(
          _contractor);

        const gasCost = contractorPreForGasCalc.minus(
          contractorPost);
        contractorPost.plus(_value)
          .plus(gasCost)
          .should.be.bignumber.equal(contractorPre);
      });

    it(
      'CoinSparrow Fees should be correctly calculated after successful Contractor release',
      async function () {
        const feesPre = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await increaseTimeTo(latestTime() + duration.weeks(
          5));
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const feesPost = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        feesPost.minus(feesPre)
          .should.be.bignumber.equal(_fee);
      });
  });
});
